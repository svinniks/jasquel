/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import jasquel.common.TextFile;
import jasquel.exceptions.NestingException;
import jasquel.run.event.Error;
import jasquel.run.event.*;
import jasquel.run.unit.*;
import jdk.nashorn.api.scripting.NashornException;
import jdk.nashorn.internal.objects.NativeError;

import javax.script.ScriptEngine;
import javax.script.ScriptException;
import java.io.*;
import java.util.HashSet;
import java.util.Set;
import java.util.Stack;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.function.Supplier;

import static jasquel.common.Log.LOGGER;
import static jasquel.common.StringUtil.nvl;
import static java.util.logging.Level.SEVERE;
import static javax.script.ScriptContext.ENGINE_SCOPE;

/**
 *
 * @author s.vinniks
 */
public class ScriptRun {

    public static Reader getResourceFileReader(String fileName) {
        return new InputStreamReader(EngineThread.class.getClassLoader().getResourceAsStream(fileName));
    }

    private static final Set<String> SERVICE_METHODS;
    
    static {
        
        SERVICE_METHODS = new HashSet<>();
        SERVICE_METHODS.add("suite");
        SERVICE_METHODS.add("suitef");
        SERVICE_METHODS.add("test");
        SERVICE_METHODS.add("testf");
        SERVICE_METHODS.add("setup");
        SERVICE_METHODS.add("teardown");
        
    }

    private final File testDirectory;
    private final Supplier<String> environmentSupplier;
    private final File file;
    private final boolean force;
    private final ActiveRun run;
    
    private final Gson gson;
    
    private final BlockingQueue<Event> eventQueue;
    private final Stack<TestUnit> unitStack;

    private volatile Runnable remoteAbortHandler;
    private volatile transient boolean aborted;
    
    public ScriptRun(Supplier<String> environmentSupplier, File testDirectory, File file, boolean force, ActiveRun run) {

        this.testDirectory = testDirectory;
        this.environmentSupplier = environmentSupplier;
        this.file = file;
        this.force = force;
        this.run = run;
        
        gson = new Gson();
        
        eventQueue = new LinkedBlockingQueue<>();
        unitStack = new Stack<>();
        
        aborted = false;
        
    }
    
    private void runBeforeScript(ScriptEngine engine) throws FileNotFoundException, ScriptException {

        long start = System.currentTimeMillis();

        File file = new File("before.js");
        
        if (file.exists() && !file.isDirectory()) {
            String source = TextFile.read(file);
            engine.eval(source);
        }

    }
    
    private void runAfterScript(ScriptEngine engine) throws FileNotFoundException, ScriptException {
        
        File file = new File("after.js");
        
        if (file.exists() && !file.isDirectory()) {
            String source = TextFile.read(file);
            engine.eval(source);
        }
        
    }
    
    public void start(ScriptEngine engine) {
        
        Script script = new Script(testDirectory.toPath().relativize(file.toPath()).toString());
        
        unitStack.push(script);
        eventQueue.add(new UnitStart(script));
        
        StringBuilder errorBuilder = new StringBuilder();
        
        try {

            engine.getBindings(ENGINE_SCOPE).put("script", this);
            engine.getBindings(ENGINE_SCOPE).put("force", false);
            
            engine.eval(getResourceFileReader("js/jasquel.js"));
            runBeforeScript(engine);
            
            engine.eval(new InputStreamReader(new FileInputStream(file), "UTF-8"));
            
        } catch (Throwable ex) {
            
            errorBuilder.append(nvl(ex.getMessage(), ex.getClass().getName()));
            
        } finally {
            
            try {
                
                runAfterScript(engine);
                
            } catch (Throwable ex) {
                
                if (errorBuilder.length() > 0)
                    errorBuilder.append('\n');
                
                errorBuilder.append(nvl(ex.getMessage(), ex.getClass().getName()));
                
            } finally {
                
                if (errorBuilder.length() > 0)
                    eventQueue.add(new Error(errorBuilder.toString(), script.getDuration()));
                else
                    eventQueue.add(new Success(script.getDuration()));
                
            }
            
        }
        
    }
    
    private int getLineNumber(NativeError callStackExtract) {
        
        StackTraceElement[] callStack = NashornException.getScriptFrames((NashornException)callStackExtract.nashornException);
        
        for (StackTraceElement element : callStack) 
            if (!SERVICE_METHODS.contains(element.getMethodName()))
                return element.getLineNumber();
        
        return -1;
        
    }
    
    private int getLineNumber(NativeError callStackExtract, int compensate) {
        
        StackTraceElement[] callStack = NashornException.getScriptFrames((NashornException)callStackExtract.nashornException);
        
        return callStack[compensate].getLineNumber();
        
    }
    
    public void suiteStart(String name, NativeError callStackExtract) throws NestingException, InterruptedException {
        
        TestUnit context = unitStack.peek();
        
        if (context instanceof Test)
            throw new NestingException("\"suite\" is not allowed in this context!");
        
        Suite suite = new Suite(name, getLineNumber(callStackExtract));
        suite.skip = unitStack.peek().skip;
        
        unitStack.push(suite);
        eventQueue.add(new UnitStart(suite));
        
    }
    
    public void testStart(String name, NativeError callStackExtract) throws NestingException, InterruptedException {
        
        TestUnit context = unitStack.peek();
        
        if (context instanceof Test)
            throw new NestingException("\"test\" and \"testf\" are not allowed in this context!");
        
        Test test = new Test(name, getLineNumber(callStackExtract));
        test.skip = unitStack.peek().skip;
        
        unitStack.push(test);
        eventQueue.add(new UnitStart(test));
        
    }
    
    public void setupStart(String name, NativeError callStackExtract) throws NestingException, InterruptedException {
        
        TestUnit context = unitStack.peek();
        
        if (context instanceof Test)
            throw new NestingException("\"setup\" is not allowed in this context!");
        
        Setup setup = new Setup(name, getLineNumber(callStackExtract));
        setup.skip = unitStack.peek().skip;
        
        unitStack.push(setup);
        eventQueue.add(new UnitStart(setup));
        
    }
    
    public void teardownStart(String name, NativeError callStackExtract) throws NestingException, InterruptedException {
        
        TestUnit context = unitStack.peek();
        
        if (context instanceof Test)
            throw new NestingException("\"teardown\" is not allowed in this context!");
        
        Teardown teardown = new Teardown(name, getLineNumber(callStackExtract));
        teardown.skip = unitStack.peek().skip;
        
        unitStack.push(teardown);
        eventQueue.add(new UnitStart(teardown));
        
    }

    public void stepStart(String name, NativeError callStackExtract) throws NestingException, InterruptedException {

        TestUnit context = unitStack.peek();

        if (!(context instanceof Test))
            throw new NestingException("\"step\" is not allowed in this context!");

        Step step = new Step(name, getLineNumber(callStackExtract));

        unitStack.push(step);
        eventQueue.add(new UnitStart(step));

    }
    
    public void callStart(String name, String paramJson, NativeError callStackExtract) throws NestingException, InterruptedException {
        
        Call call = new Call(name, gson.fromJson(paramJson, JsonElement.class), getLineNumber(callStackExtract, 2));
        
        unitStack.push(call);
        eventQueue.add(new UnitStart(call));
        
    }
     
    public void success(String resultJson) throws InterruptedException {
        TestUnit unit = unitStack.pop();
        eventQueue.add(new Success(unit.getDuration(), gson.fromJson(resultJson, JsonElement.class)));
    }
    
    public void error(String message) throws InterruptedException {

        TestUnit unit = unitStack.pop();

        if (unit instanceof Setup || unit instanceof Teardown)
            unitStack.peek().skip = true;

        eventQueue.add(new Error(message, unit.getDuration()));

    }
    
    public void info(String message) throws InterruptedException {
        eventQueue.add(new Info(message));
    }
    
    public void emitEvents() {
        
        int unitStackDepth = 0;
        
        while (!run.isStray()) {
            
            try {
                
                Event event = eventQueue.take();

                run.addEvent(event);

                if (event instanceof UnitStart)
                    unitStackDepth++;
                else if (event instanceof UnitEnd)
                    if (--unitStackDepth == 0)
                        return;

            } catch (InterruptedException ex) {
                return;
            }
            
        }
        
        abort();
        
    }

    public File getFile() {
        return file;
    }

    public String getEnvironment() {
        return environmentSupplier.get();
    }

    public void setRemoteAbortHandler(Runnable handler) {
        this.remoteAbortHandler = handler;
    }

    public void abort() {

        aborted = true;

        Runnable remoteAbortHandler = this.remoteAbortHandler;

        if (remoteAbortHandler != null)
            remoteAbortHandler.run();

    }

    public boolean isAborted() {
        return aborted;
    }

    public boolean isForce() {
        return force;
    }

    public boolean skip() {
        return unitStack.peek().skip;
    }
    
}
