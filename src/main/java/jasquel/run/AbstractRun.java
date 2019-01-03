package jasquel.run;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import jasquel.reporter.Reporter;
import jasquel.run.event.Event;
import jasquel.run.manager.EventAdapter;
import jasquel.run.manager.TestUnitAdapter;
import jasquel.run.unit.TestUnit;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static jasquel.common.Log.log;
import static java.util.logging.Level.FINER;

/**
 * Created by Sergejs Vinniks on 10-Dec-18.
 */
public abstract class AbstractRun {

    protected final static Gson GSON;
    protected final static Type EVENT_LIST_TYPE = new TypeToken<List<Event>>(){}.getType();

    static {
        GSON = new GsonBuilder()
                .registerTypeAdapter(Event.class, new EventAdapter())
                .registerTypeAdapter(TestUnit.class, new TestUnitAdapter())
                .create();
    }

    public static class Summary {
        boolean shared;
        String environment;
        String description;
        long startTime;
        Integer failCount;
        Integer passCount;
        Boolean setupError;
        Long duration;
        boolean active = false;
    }

    protected final String id;
    protected final Set<Reporter> reporters;

    protected boolean observed;

    public AbstractRun(String id) {

        this.id = id;

        this.reporters = new HashSet<>();
        observed = false;

    }

    public String getId() {
        return id;
    }

    public abstract Summary getSummary() throws IOException;
    public abstract List<Event> getEvents() throws IOException;

    public void addReporter(Reporter reporter) throws IOException {

        synchronized (reporters) {

            log(FINER, "%s %s attached.\n", getId(), reporter.getClass().getSimpleName());

            for (Event event : getEvents())
                reporter.addEvent(event);

            reporters.add(reporter);
            observed = true;

        }

    }

    public void removeReporter(Reporter reporter) {

        synchronized (reporters) {
            reporters.remove(reporter);
            log(FINER, "%s %s detached.\n", getId(), reporter.getClass().getSimpleName());
        }

    }

}
