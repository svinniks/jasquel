/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run;

import jasquel.reporter.Reporter;
import jasquel.run.event.*;
import jasquel.run.event.Error;
import jasquel.run.unit.Setup;
import jasquel.run.unit.Teardown;
import jasquel.run.unit.Test;
import jasquel.run.unit.TestUnit;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static jasquel.common.Log.LOGGER;
import static java.util.logging.Level.SEVERE;

/**
 *
 * @author s.vinniks
 */
public class ActiveRun extends AbstractRun {

    private Summary summary;
    private List<Event> events;

    private Runnable abortHandler;
    private Stack<TestUnit> unitStack;

    public ActiveRun(String id, boolean shared, String environment, String description) {

        super(id);

        summary = new Summary();
        summary.startTime = System.currentTimeMillis();
        summary.shared = shared;
        summary.environment = environment;
        summary.description = description;
        summary.failCount = 0;
        summary.passCount = 0;
        summary.setupError = false;
        summary.active = true;

        events = new ArrayList<>();
        unitStack = new Stack<>();

    }

    @Override
    public Summary getSummary() {
        return summary;
    }

    @Override
    public List<Event> getEvents() {
        return Collections.unmodifiableList(events);
    }


    public void onAbort(Runnable handler) {
        abortHandler = handler;
    }

    public void addEvent(Event event) {

        if (event instanceof RunStart)
            summary.startTime = ((RunStart) event).startTime;
        else if (event instanceof UnitStart)
            unitStack.push(((UnitStart) event).unit);
        else if (event instanceof UnitEnd)
            if (unitStack.empty())
                summary.duration = System.currentTimeMillis() - summary.startTime;
            else {

                TestUnit unit = unitStack.pop();

                if (unit instanceof Setup || unit instanceof Teardown) {
                    if (event instanceof Error)
                        summary.setupError = true;
                } else if (unit instanceof Test)
                    if (event instanceof Success)
                        summary.passCount++;
                    else
                        summary.failCount++;


            }

        synchronized (reporters) {

            events.add(event);

            for (Reporter reporter : reporters)
                reporter.addEvent(event);

        }
        
    }
    
    public boolean isStray() {
        
        synchronized (reporters) {
            return (!summary.shared && observed && reporters.isEmpty());
        }
        
    }

    public void pingReporters() {

        for (Reporter reporter : reporters.toArray(new Reporter[reporters.size()]))
            try {
                reporter.ping();
            } catch (Throwable ex) {
                removeReporter(reporter);
            }

    }

    public void abort() {
        
        if (abortHandler != null)
            abortHandler.run();
        
    }

    public void save(File file) {

        summary.active = false;

        try (
                FileOutputStream fileOutputStream = new FileOutputStream(file);
                ZipOutputStream zipOutputStream = new ZipOutputStream(fileOutputStream);
                OutputStreamWriter zipWriter = new OutputStreamWriter(zipOutputStream))
        {

            ZipEntry zipEntry = new ZipEntry("summary.json");
            zipOutputStream.putNextEntry(zipEntry);

            GSON.toJson(summary, zipWriter);
            zipWriter.flush();

            zipEntry = new ZipEntry("events.json");
            zipOutputStream.putNextEntry(zipEntry);

            GSON.toJson(events, EVENT_LIST_TYPE, zipWriter);

        } catch (IOException ex) {
            LOGGER.log(SEVERE, String.format("An error occured while saving %s report!", id), ex);
        }

    }

}
