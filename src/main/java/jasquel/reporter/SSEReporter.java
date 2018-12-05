/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.reporter;

import com.google.gson.Gson;
import com.google.gson.stream.JsonWriter;
import jasquel.exceptions.ReporterException;
import jasquel.run.event.RunStart;
import jasquel.run.event.Event;
import jasquel.run.event.Info;
import jasquel.run.event.UnitStart;
import java.io.IOException;
import java.io.PrintWriter;
import jasquel.run.event.UnitEnd;

/**
 *
 * @author s.vinniks
 */
public class SSEReporter extends Reporter {

    final private int eventBufferSize;
    final private int eventOutputFrequency;
    final private PrintWriter writer;

    private final Gson gson;
    private volatile Thread thread;

    public SSEReporter(int eventBufferSize, int eventOutputFrequency, PrintWriter writer) {

        this.eventBufferSize = eventBufferSize;
        this.eventOutputFrequency = eventOutputFrequency;
        this.writer = writer;

        gson = new Gson();
                
    }

    private void outputEvents(Event[] events, int eventCount) throws IOException {

        synchronized (writer) {
        
            writer.append("data:");

            JsonWriter jsonWriter = new JsonWriter(writer);
            jsonWriter.beginArray();

            for (int i = 0; i < eventCount; i++)
                jsonWriter
                    .beginObject()
                    .name("event")
                    .value(events[i].getClass().getSimpleName())
                    .name("data")
                    .jsonValue(gson.toJson(events[i]))
                    .endObject();

            jsonWriter
                .endArray()
                .flush();

            writer.append("\n\n");
            writer.flush();

            if (writer.checkError())
                throw new ReporterException();
            
        }
        
    }
    
    @Override
    public void emitEvents() {
        
        thread = Thread.currentThread();
        int unitStackDepth = 0;

        Event[] eventBuffer = new Event[eventBufferSize];
        int eventCount = 0;
        long lastOutputTime = System.currentTimeMillis();

        boolean finished = false;

        while (!thread.isInterrupted()) {

            Event event;
            
            try {

                long currentTime = System.currentTimeMillis();
                event = pollEvent(Math.max(0, eventOutputFrequency - currentTime + lastOutputTime));

                if (event != null) {

                    eventBuffer[eventCount++] = event;

                    if (event instanceof RunStart || event instanceof UnitStart)
                        unitStackDepth++;
                    else if (event instanceof UnitEnd)
                        if (--unitStackDepth == 0)
                            finished = true;

                }

                if (finished || eventCount == eventBufferSize || currentTime - lastOutputTime >= eventOutputFrequency) {

                    if (eventCount > 0)
                        outputEvents(eventBuffer, eventCount);

                    eventCount = 0;
                    lastOutputTime = currentTime;

                }

                if (finished)
                    break;

            } catch (Throwable ex) {
                break;
            }

        }
        
    }

    @Override
    public void ping() throws IOException {
        
        synchronized (writer) {
            
            try {
                
                writer.append("data:{\"event\":\"Ping\"}\n\n");
                
            } catch (Throwable ex) {
                
                if (thread != null)
                    thread.interrupt();
                
                throw new ReporterException();
                
            }

            if (writer.checkError()) {
                
                if (thread != null)
                    thread.interrupt();
                
                throw new ReporterException();
                
            }

        }
        
    }
    
}
