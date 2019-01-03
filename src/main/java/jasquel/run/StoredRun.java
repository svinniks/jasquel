package jasquel.run;

import jasquel.run.event.Event;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static jasquel.common.Log.LOGGER;
import static java.util.logging.Level.SEVERE;

/**
 * Created by Sergejs Vinniks on 10-Dec-18.
 */
public class StoredRun extends AbstractRun {

    private final File file;

    private Summary summary;
    private List<Event> events;

    public StoredRun(String id, File file) {
        super(id);
        this.file = file;
    }

    private <T> T loadEntity(String name, Type typeOfT) throws IOException {

        try (
                FileInputStream inputStream = new FileInputStream(file);
                ZipInputStream zipInputStream = new ZipInputStream(inputStream);
                InputStreamReader zipReader = new InputStreamReader(zipInputStream)
        ) {

            ZipEntry zipEntry = zipInputStream.getNextEntry();

            while (zipEntry != null) {

                if (zipEntry.getName().equals(name))
                    return GSON.fromJson(zipReader, typeOfT);

                zipEntry = zipInputStream.getNextEntry();

            }

            throw new IOException(String.format("Structure of the test run %s report archive is invalid!", id));

        }

    }

    @Override
    public Summary getSummary() throws IOException {

        if (summary == null)
            summary = loadEntity("summary.json", Summary.class);

        return summary;

    }

    @Override
    public List<Event> getEvents() throws IOException {

        if (events == null)
            events = loadEntity("events.json", EVENT_LIST_TYPE);

        return events;

    }

}
