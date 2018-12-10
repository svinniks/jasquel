package jasquel;

import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.Options;
import org.apache.commons.cli.ParseException;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.gzip.GzipHandler;
import org.eclipse.jetty.webapp.WebAppContext;

import java.io.File;
import java.io.IOException;
import java.util.ResourceBundle;
import java.util.logging.ConsoleHandler;
import java.util.logging.Handler;

import static jasquel.Jasquel.Mode.SERVER;
import static jasquel.common.Log.LOGGER;
import static java.util.logging.Level.FINEST;

public class Jasquel {

    public enum Mode {
        RUN,
        WATCH,
        SERVER
    }

    private static Options applicationOptions;

    static {
        applicationOptions = new Options();
        applicationOptions.addRequiredOption("m", "mode", true, "Jasquel mode (run, watch or server)");
        applicationOptions.addOption("p", "port", true, "TCP port to listen for HTTP requests");
        applicationOptions.addOption("td", "test-dir", true, "Path to the directory containing test scripts (default is \"test\")");
        applicationOptions.addOption("rd", "run-dir", true, "Path to the directory where run reports are stored (default is \"run\")");
        applicationOptions.addOption("eb", "event-buffer-size", true, "The largest amount of run events to be sent in one write.");
        applicationOptions.addOption("ef", "event-write-frequency", true, "Minimum delay between sending run event portions.");
        applicationOptions.addOption("ce", "compress-events", false, "Whether to compress events with the GZIP handler.");
    }

    private CommandLine commandLine;

    private Mode mode;
    private int port;
    private File testDirectory;
    private File runDirectory;
    private int eventBufferSize;
    private int eventWriteFrequency;
    private boolean compressEvents;

    public Jasquel(String[] args) throws ParseException {
        commandLine = new DefaultParser().parse(applicationOptions, args);
    }

    public String getVersion() {
        ResourceBundle resourceBundle = ResourceBundle.getBundle("version");
        return resourceBundle.getString("version");
    }

    public Project getProject() {

        try {
            return Project.load();
        } catch (IOException ex) {
            throw new RuntimeException(ex);
        }

    }

    public File getTestDirectory() {
        return testDirectory;
    }

    public File getRunDirectory() {
        return runDirectory;
    }

    public int getEventBufferSize() {
        return eventBufferSize;
    }

    public int getEventWriteFrequency() {
        return eventWriteFrequency;
    }

    public boolean getCompressEvents() {
        return compressEvents;
    }

    private void configure() throws Exception {

        String modeOption = commandLine.getOptionValue("mode").toUpperCase();

        try {
            mode = Mode.valueOf(modeOption);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(String.format("Invalid mode %s!", modeOption));
        }

        if (mode == SERVER) {

            String portOption = commandLine.getOptionValue("port", "8000");

            try {
                port = Integer.valueOf(portOption);
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException(String.format("Invalid port %s!", portOption));
            }

            if (port <= 0 || port >= 65535) {
                throw new IllegalArgumentException(String.format("Invalid port %s!", portOption));
            }

        }

        String testDirOption = commandLine.getOptionValue("test-dir", "test");

        testDirectory = new File(testDirOption);

        if (!testDirectory.exists() || !testDirectory.isDirectory()) {
            throw new IllegalArgumentException(String.format("Test directory path %s does not exist or is not a directory!", testDirOption));
        }

        testDirectory = testDirectory.getAbsoluteFile();

        String runDirOption = commandLine.getOptionValue("run-dir", "run");

        runDirectory = new File(runDirOption);

        if (!runDirectory.exists() || !runDirectory.isDirectory()) {
            throw new IllegalArgumentException(String.format("ActiveRun directory path %s does not exist or is not a directory!", runDirOption));
        }

        runDirectory = runDirectory.getAbsoluteFile();

        String eventBufferSizeOption = commandLine.getOptionValue("event-buffer-size", "1000");

        try {
            eventBufferSize = Integer.valueOf(eventBufferSizeOption);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(String.format("Invalid event buffer size %s!", eventBufferSizeOption));
        }

        if (eventBufferSize < 1)
            throw new IllegalArgumentException(String.format("Invalid event buffer size %s!", eventBufferSizeOption));

        String eventWriteFrequencyOption = commandLine.getOptionValue("event-write-frequency", "10");

        try {
            eventWriteFrequency = Integer.valueOf(eventWriteFrequencyOption);
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException(String.format("Invalid event write frequency %s!", eventWriteFrequencyOption));
        }

        if (eventWriteFrequency < 1)
            throw new IllegalArgumentException(String.format("Invalid event write frequency %s!", eventWriteFrequencyOption));

        compressEvents = commandLine.hasOption("compress-events");

    }

    public void start() throws Exception {

        configure();

        switch (mode) {
            case SERVER:
                startServer();
                break;
            default:
                throw new IllegalArgumentException(String.format("%s mode is not supported by this release!", mode));
        }

    };

    private void startServer() throws Exception {

        LOGGER.setLevel(FINEST);

        Handler handler = new ConsoleHandler();
        handler.setLevel(FINEST);
        LOGGER.addHandler(handler);

        Server jetty = new Server(port);

        String webDir = getClass().getClassLoader().getResource("webapp").toExternalForm();
        WebAppContext webapp = new WebAppContext(webDir, "/");
        webapp.setAttribute("jasquel", this);

        if (compressEvents) {

            GzipHandler gzipHandler = new GzipHandler();
            gzipHandler.setIncludedMimeTypes("text/event-stream");
            gzipHandler.setHandler(webapp);
            gzipHandler.setSyncFlush(true);

            jetty.setHandler(gzipHandler);

        } else
            jetty.setHandler(webapp);

        jetty.start();
        jetty.join();

    }

    public static void main(String[] args) throws Exception {
        new Jasquel(args).start();
    }

}

