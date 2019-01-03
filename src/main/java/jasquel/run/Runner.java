/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run;

import static jasquel.common.Log.log;
import jasquel.run.action.RunErrorAction;
import jasquel.run.action.RunSuccessAction;
import jasquel.run.action.RunScriptAction;
import jasquel.run.action.RunAction;
import jasquel.run.event.Error;
import jasquel.run.event.RunStart;
import jasquel.run.event.Success;
import java.io.File;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;

import static java.util.logging.Level.FINE;
import static java.util.logging.Level.FINER;

/**
 *
 * @author s.vinniks
 */
public abstract class Runner {

    private final static int REPORTER_PING_INTERVAL = 2000;

    private final ScriptEnginePool enginePool;
    protected ActiveRun run;
    protected final File testDirectory;
    private final String environmentName;
    private final Function<String, String> environmentSupplier;
    private final int engineThreadCount;

    private final BlockingQueue<RunAction> executionActionQueue;
    private final BlockingQueue<RunAction> outputActionQueue;
    private final Lock outputSyncLock;

    private boolean force;
    private EngineThread[] engineThreads;

    protected Thread scriptEnqueueThread;
    
    public Runner(
            ScriptEnginePool enginePool,
            ActiveRun run,
            File testDirectory,
            String environmentName,
            Function<String, String> environmentSupplier,
            int engineThreadCount
    ) {

        this.enginePool = enginePool;
        this.run = run;
        this.testDirectory = testDirectory;
        this.environmentName = environmentName;
        this.environmentSupplier = environmentSupplier;
        this.engineThreadCount = engineThreadCount;
        
        executionActionQueue = new LinkedBlockingQueue<>();
        outputActionQueue = new LinkedBlockingQueue<>();
        outputSyncLock = new ReentrantLock();

        run.onAbort(() -> abort());
        
    }
    
    protected abstract void enqueueScripts() throws Throwable;

    public void enqueueScript(File file) {

        executionActionQueue.add(
            new RunScriptAction(
                new ScriptRun(
                    () -> environmentSupplier.apply(environmentName),
                    testDirectory,
                    file,
                    force,
                    run
                )
            )
        );

    }
    
    public void success() {
        executionActionQueue.add(new RunSuccessAction());
    }
    
    public void error(String error) {
        executionActionQueue.add(new RunErrorAction(error));
    }
    
    private long getDuration() {
        return System.currentTimeMillis() - run.getSummary().startTime;
    }

    @SuppressWarnings("SleepWhileInLoop")
    private Thread createReporterPingThread() {

        return new Thread(() -> {

            log(FINER, "%s reporter ping thread started.\n", run.getId());

            while (!Thread.currentThread().isInterrupted()) {

                try {
                    Thread.sleep(REPORTER_PING_INTERVAL);
                } catch (InterruptedException ex) {
                    break;
                }

                run.pingReporters();

                if (run.isStray())
                    abort();

            }

            log(FINER, "%s reporter ping thread finished.\n", run.getId());

        });

    }

    public void start() {

        log(FINE, "%s %s started.\n", getClass().getSimpleName(), run.getId());

        Thread reporterPingThread = createReporterPingThread();
        reporterPingThread.start();

        engineThreads = new EngineThread[engineThreadCount];

        for (int i = 0; i < engineThreads.length; i++) {
            engineThreads[i] = new EngineThread(enginePool, executionActionQueue, outputActionQueue, outputSyncLock, i + 1, run);
            engineThreads[i].start();
        }

        scriptEnqueueThread = new Thread(() ->  {

            log(FINER, "%s script enqueue thread started.\n", run.getId());

            try {
                enqueueScripts();
            } catch (Throwable ex) {
                error(ex.toString());
            }
            
            log(FINER, "%s script enqueue thread finished.\n", run.getId());

        });

        run.addEvent(
                new RunStart(environmentName, run.getSummary().startTime)
        );

        if (run.isStray())
            return;
        
        scriptEnqueueThread.start();
        boolean finished = false;

        while (true) {
            
            RunAction action;
            
            try {
                action = outputActionQueue.take();
            } catch (InterruptedException ex) {
                break;
            }
                
            if (action instanceof RunScriptAction) {
                ((RunScriptAction) action).scriptRun.emitEvents();
            } else if (action instanceof RunSuccessAction) {
                run.addEvent(new Success(getDuration()));
                break;
            } else if (action instanceof RunErrorAction) {
                run.addEvent(new Error(((RunErrorAction)action).error, getDuration()));
                break;
            }

            if (run.isStray())
                break;
            
        }   
        
        scriptEnqueueThread.interrupt();
        
        for (EngineThread engineThread : engineThreads)
            engineThread.interrupt();

        log(FINE, "%s finished.\n", run.getId());

        reporterPingThread.interrupt();

    }

    public boolean isForce() {
        return force;
    }

    public void setForce(boolean force) {
        this.force = force;
    }
    
    public void abort() {
        
        for (EngineThread engineThread : engineThreads)
            engineThread.abort();
        
        outputActionQueue.add(new RunErrorAction("Execution aborted by the user!"));
        
    }

}
