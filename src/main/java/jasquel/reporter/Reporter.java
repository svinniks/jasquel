/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.reporter;

import jasquel.run.event.Event;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static java.util.concurrent.TimeUnit.MICROSECONDS;
import static java.util.concurrent.TimeUnit.MILLISECONDS;

/**
 *
 * @author s.vinniks
 */
public abstract class Reporter {
    
    private final BlockingQueue<Event> eventQueue;
    
    public Reporter() {
        eventQueue = new LinkedBlockingQueue<>();
    }
    
    public void addEvent(Event event) {
        eventQueue.add(event);
    }
    
    protected Event takeEvent() throws InterruptedException {
        return eventQueue.take();
    }

    protected Event pollEvent(long timeout) throws InterruptedException {
        return eventQueue.poll(timeout, MILLISECONDS);
    }
    
    public abstract void emitEvents();
    
    public void ping() throws Throwable {
        
    }
    
}

