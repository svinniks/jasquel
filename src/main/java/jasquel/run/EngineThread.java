/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run;

import static jasquel.common.Log.log;
import jasquel.run.action.RunAction;
import jasquel.run.action.RunScriptAction;
import jdk.nashorn.api.scripting.NashornScriptEngineFactory;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.locks.Lock;
import static java.util.logging.Level.FINER;
import javax.script.ScriptEngine;
import javax.script.SimpleScriptContext;

/**
 *
 * @author s.vinniks
 */
public class EngineThread extends Thread {

    private final ScriptEnginePool enginePool;
    private final BlockingQueue<RunAction> executionActionQueue;
    private final BlockingQueue<RunAction> outputActionQueue;
    private final Lock outputSyncLock;
    private final int number;
    private final ActiveRun run;
    
    private volatile ScriptRun currentScriptRun;
    
    public EngineThread(ScriptEnginePool enginePool, BlockingQueue<RunAction> executionActionQueue, BlockingQueue<RunAction> outputActionQueue, Lock outputSyncLock, int number, ActiveRun run) {

        this.enginePool = enginePool;
        this.executionActionQueue = executionActionQueue;
        this.outputActionQueue = outputActionQueue;
        this.outputSyncLock = outputSyncLock;
        this.number = number;
        this.run = run;

    }
    
    @Override
    public void run() {
        
        log(FINER, "%s engine thread %d started.\n", run.getId(), number);

        ScriptEngine engine = enginePool.getEngine();
        
        while (!isInterrupted()) {

            RunAction action;
            
            try {
                outputSyncLock.lockInterruptibly();
            } catch (InterruptedException ex) {
                break;
            }
            
            try {
                action = executionActionQueue.take();
                outputActionQueue.add(action);
            } catch (InterruptedException ex) {
                break;
            } finally {
                outputSyncLock.unlock();
            }
            
            if (action instanceof RunScriptAction) {
            
                currentScriptRun = ((RunScriptAction)(action)).scriptRun;

                engine.setContext(new SimpleScriptContext());
                currentScriptRun.start(engine);

                currentScriptRun = null;
                
            }
            
        }

        enginePool.releaseEngine(engine);

        log(FINER, "%s engine thread %d finished.\n", run.getId(), number);
        
    }
    
    public void abort() {
        
        ScriptRun scriptRun = currentScriptRun;
        
        if (scriptRun != null)
            scriptRun.abort();
        
        interrupt();
        
    }
    
}
