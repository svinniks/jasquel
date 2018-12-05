/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.server;

import com.google.gson.Gson;
import com.google.gson.stream.JsonWriter;
import jasquel.Jasquel;
import jasquel.Project;
import jasquel.exceptions.ArgumentException;
import jasquel.reporter.SSEReporter;
import jasquel.run.FileRunner;
import jasquel.run.FileWatcher;
import jasquel.run.Run;
import jasquel.run.ScriptEnginePool;
import jasquel.run.manager.RunManager;
import org.apache.commons.io.FilenameUtils;

import javax.script.ScriptException;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static jasquel.common.Log.LOGGER;
import static java.util.logging.Level.SEVERE;
import static javax.servlet.http.HttpServletResponse.SC_NOT_FOUND;
import static javax.servlet.http.HttpServletResponse.SC_OK;

/**
 *
 * @author s.vinniks
 */
public class JasquelServlet extends HttpServlet {

    private final Pattern JS_FILE_PATTERN = Pattern.compile(".*\\.js");
    private final Pattern SUMMARY_FILE_PATTERN = Pattern.compile("^.*\\.summary\\.json$");
    
    private String project;
    private Jasquel jasquel;

    private ScriptEnginePool enginePool;
    private RunManager runManager;
    
    @SuppressWarnings("SynchronizeOnNonFinalField")
    private void processRunGetRequest(HttpServletRequest request, HttpServletResponse response) throws IOException, ScriptException {
        
        String runId = request.getPathInfo().substring(5);
        Run run = runManager.getRun(runId);
            
        if (run == null) 
    
            response.setStatus(SC_NOT_FOUND);
    
        else {
                   
            response.setContentType("text/event-stream");
            //response.setContentType("text/html");
            response.setCharacterEncoding("UTF-8");
            response.addHeader("Cache-Control", "no-cache");

            try (PrintWriter writer = response.getWriter()) {
                
                SSEReporter reporter = new SSEReporter(jasquel.getEventBufferSize(), jasquel.getEventWriteFrequency(), writer);
                
                run.addReporter(reporter);
                reporter.emitEvents();
                run.removeReporter(reporter);
                
            }

            response.setStatus(SC_OK);
            
        }
        
    }
    
    private void outputFileDir(File dir, JsonWriter jsonWriter) throws IOException {
        
        jsonWriter
                .beginObject()
                .name("name")
                .value(dir.getName())
                .name("type")
                .value("folder")
                .name("children")
                .beginArray();
        
        File[] files = dir.listFiles((File pathname) -> {
            
            if (pathname.isDirectory())
                return true;
            else    
                return JS_FILE_PATTERN.matcher(pathname.getName()).matches();
            
        });
        
        Arrays.sort(files);
        
        for (File file : files)
            
            if (file.isDirectory())
                
                outputFileDir(file, jsonWriter);
                
             else
                
                jsonWriter
                        .beginObject()
                        .name("name")
                        .value(file.getName())
                        .name("type")
                        .value("file")
                        .endObject();
                        
        jsonWriter
                .endArray()
                .endObject();
        
    }
    
    private void processFilesGetRequest(HttpServletRequest request, HttpServletResponse response) throws IOException {
        
        response.setContentType("application/json");
        
        try (PrintWriter writer = response.getWriter(); JsonWriter jsonWriter = new JsonWriter(writer)) {
            outputFileDir(jasquel.getTestDirectory(), jsonWriter);
        }
        
    }
    
    private void outputRuns(JsonWriter jsonWriter) throws IOException {

        Gson gson = new Gson();

        File[] files = jasquel.getRunDirectory().listFiles(
            (file) -> file.isFile() && file.getName().matches("^[0-9]{4}_[0-9]{2}_[0-9]{2}-.*\\.run$")
        );

        Arrays.sort(files, Collections.reverseOrder());

        jsonWriter.beginArray();

        String currentMonth = null;
        String currentDay = null;

        for (File file : files) {

            LocalDate fileDate;

            try {

                fileDate = LocalDate.parse(file.getName().substring(0, 10), DateTimeFormatter.ofPattern("yyyy_MM_dd"));

            } catch (Exception ex) {
                continue;
            }

            String id = FilenameUtils.removeExtension(file.getName());
            Run.Summary summary = null;

            Run activeRun = runManager.getActiveRun(id);

            if (activeRun != null)
                summary = activeRun.getSummary();
            else
                try (
                        FileInputStream fileInputStream = new FileInputStream(file);
                        ZipInputStream zipInputStream = new ZipInputStream(fileInputStream);
                        InputStreamReader zipReader = new InputStreamReader(zipInputStream)
                ) {

                    ZipEntry zipEntry = zipInputStream.getNextEntry();

                    while (zipEntry != null) {

                        if (zipEntry.getName().equals("summary.json")) {
                            summary = runManager.loadRunSummary(zipReader);
                            break;
                        }

                        zipEntry = zipInputStream.getNextEntry();

                    }

                } catch (IOException ex) {
                    continue;
                }

            if (summary == null)
                continue;

            String month = fileDate.getMonth().getDisplayName(TextStyle.FULL, Locale.getDefault()) + ", " + fileDate.getYear();
            String day = fileDate.getDayOfMonth() + ", " + fileDate.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.getDefault());

            if (!month.equals(currentMonth)) {

                if (currentMonth != null) {
                    jsonWriter
                        .endArray()
                        .endObject()
                        .endArray()
                        .endObject();
                }

                jsonWriter
                    .beginObject()
                    .name("month").value(month)
                    .name("days").beginArray()
                    .beginObject()
                    .name("day").value(day)
                    .name("runs").beginArray();

                currentMonth = month;
                currentDay = day;

            } else if (!day.equals(currentDay)) {

                jsonWriter
                    .endArray()
                    .endObject()
                    .beginObject()
                    .name("day").value(day)
                    .name("runs").beginArray();

                currentDay = day;

            }

            jsonWriter
                .beginObject()
                .name("id").value(id)
                .name("summary");

            gson.toJson(summary, Run.Summary.class, jsonWriter);

            jsonWriter.endObject();

        }

        if (currentMonth != null)
            jsonWriter
                .endArray()
                .endObject()
                .endArray()
                .endObject();

        jsonWriter.endArray();

    }
    
    private void processRunsGetRequest(HttpServletRequest request, HttpServletResponse response) throws IOException {
        
        response.setContentType("application/json");
        
        try (PrintWriter writer = response.getWriter(); JsonWriter jsonWriter = new JsonWriter(writer)) {
            outputRuns(jsonWriter);
        } catch (Throwable ex) {
            LOGGER.log(SEVERE, "Failed to load run list!", ex);
            throw ex;
        }
        
    }

    private void processConfigGetRequest(HttpServletRequest request, HttpServletResponse response) throws IOException {
        
        response.setContentType("text/html");
        response.setStatus(SC_OK);
        
        try (PrintWriter writer = response.getWriter(); JsonWriter jsonWriter = new JsonWriter(writer)) {

            Project project = jasquel.getProject();

            jsonWriter
                .beginObject()
                .name("version")
                .value(jasquel.getVersion())
                .name("project")
                .value(project.getName())
                .name("environments")
                .beginArray();
            
            for (String environment : project.getEnvironmentList())
                jsonWriter.value(environment);
            
            jsonWriter
                .endArray()
                .endObject();
            
        }
        
    }
    
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        
        String requestPath = request.getPathInfo() == null ? "" : request.getPathInfo();
        
        try {
            
            if (requestPath.matches("^/run/.*$"))
                processRunGetRequest(request, response);
            else if ("/runs".equals(requestPath))
                processRunsGetRequest(request, response);
            else if ("/files".equals(requestPath))
                processFilesGetRequest(request, response);
            else if ("/config".equals(requestPath))
                processConfigGetRequest(request, response);
            else
                response.setStatus(SC_NOT_FOUND);
            
        } catch (Throwable ex) {
            response.setStatus(500);
        }
        
    }
 
    @SuppressWarnings("SynchronizeOnNonFinalField")
    private void processWatchPostRequest(HttpServletRequest request, HttpServletResponse response) throws IOException, ScriptException, ArgumentException {
        
        WatchRequest watchRequest = new Gson().fromJson(request.getReader(), WatchRequest.class);

        Project project = jasquel.getProject();

        if (watchRequest.environment == null)
            throw new ArgumentException("Environment not specified!");
        else if (!project.getEnvironmentList().contains(watchRequest.environment))
            throw new ArgumentException(String.format("Invalid environment %s!", watchRequest.environment));

        Run run = runManager.startRun(watchRequest.environment);

        FileWatcher watcher = new FileWatcher(
            enginePool,
            run,
            jasquel.getTestDirectory(),
            watchRequest.environment,
            jasquel.getProject()::getEnvironment,
            1
        );

        CompletableFuture
            .runAsync(watcher::start);

        response.setContentType("application/json");
        response.setStatus(SC_OK);
        
        try (PrintWriter writer = response.getWriter(); JsonWriter jsonWriter = new JsonWriter(writer)) {
            
            jsonWriter
                .beginObject()
                .name("runId")
                .value(run.getId())
                .endObject();
            
        }
        
    }
    
    @SuppressWarnings("SynchronizeOnNonFinalField")
    private void processRunPostRequest(HttpServletRequest request, HttpServletResponse response) throws IOException, ScriptException, ArgumentException {
        
        RunRequest runRequest = new Gson().fromJson(request.getReader(), RunRequest.class);
        
        if (runRequest.threads <= 0)
            runRequest.threads = 1;

        Project project = jasquel.getProject();

        if (runRequest.environment == null)
            throw new ArgumentException("Environment not specified!");
        else if (!project.getEnvironmentList().contains(runRequest.environment))
            throw new ArgumentException(String.format("Invalid environment %s!", runRequest.environment));

        Run run = runManager.startRun(
            runRequest.shared,
            runRequest.environment,
            runRequest.description
        );

        FileRunner runner = new FileRunner(
            enginePool,
            run,
            jasquel.getTestDirectory(),
            runRequest.environment,
            jasquel.getProject()::getEnvironment,
            runRequest.threads,
            FileRunner.findScripts(jasquel.getTestDirectory(), runRequest.paths)
        );

        CompletableFuture
            .runAsync(runner::start)
            .thenRun(() -> runManager.finishRun(run));

        response.setContentType("application/json");
        response.setStatus(SC_OK);
        
        try (PrintWriter writer = response.getWriter(); JsonWriter jsonWriter = new JsonWriter(writer)) {
            
            jsonWriter
                .beginObject()
                .name("runId")
                .value(run.getId())
                .endObject();
            
        }
        
    }
    
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        
        String requestPath = request.getPathInfo();
        
        try {
            
            if (null != requestPath)
                switch (requestPath) {
                case "/watch":
                    processWatchPostRequest(request, response);
                    break;
                case "/run":
                    processRunPostRequest(request, response);
                    break;
                default:
                    response.setStatus(SC_NOT_FOUND);
                    break;
            }
            
        } catch (Throwable ex) {
            
            response.setStatus(500);
            
            try (PrintWriter writer = response.getWriter()) {
                writer.append(ex.toString());
            }
            
        }
        
    }
    
    @SuppressWarnings("SynchronizeOnNonFinalField")
    private void processRunPutRequest(HttpServletRequest request, HttpServletResponse response) throws IOException, ScriptException {
        
        String runId = request.getPathInfo().substring(5);
        Run run = runManager.getRun(runId);
        
        if (run == null)
            response.setStatus(SC_NOT_FOUND);
        else 
            run.abort();
        
        response.setStatus(SC_OK);
                
    }
    
    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        
        String requestPath = request.getPathInfo() == null ? "" : request.getPathInfo();
        
        try {
            
            if (requestPath.matches("^/run/.*$"))
                processRunPutRequest(request, response);
            else
                response.setStatus(SC_NOT_FOUND);
            
        } catch (Throwable ex) {
            response.setStatus(500);
        }
        
    }
    
    @Override
    public void init(ServletConfig config) throws ServletException {
        
        super.init(config);

        jasquel = (Jasquel)config.getServletContext().getAttribute("jasquel");
        project = (String)config.getServletContext().getAttribute("project");

        enginePool = new ScriptEnginePool();
        runManager = new RunManager(jasquel.getRunDirectory());
        
    }
    
}
