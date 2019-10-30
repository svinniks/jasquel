/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run.manager;

import jasquel.run.AbstractRun;
import jasquel.run.ActiveRun;
import jasquel.run.StoredRun;
import org.apache.commons.io.FilenameUtils;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static jasquel.common.Log.LOGGER;
import static java.util.logging.Level.SEVERE;

/**
 *
 * @author s.vinniks
 */
public class RunManager {

    private final File runDirectory;
    private final Map<String, ActiveRun> activeRuns;
    private final Map<String, File> runOutputFiles;
    
    public RunManager(File runDirectory) {
        this.runDirectory = runDirectory;
        activeRuns = new LinkedHashMap<>();
        runOutputFiles = new HashMap<>();
    }

    private synchronized File createSharedRunFile(String description, LocalDateTime runDateTimeOverride) throws IOException {

        if (description == null)
            description = "";
        else if (description.length() > 0)
            description = "-" + description.toLowerCase().replaceAll("[^a-z0-9-_\\.]", "_");

        LocalDateTime runDateTime;

        if(runDateTimeOverride != null) {
            runDateTime = runDateTimeOverride;
        } else {
            runDateTime = LocalDateTime.now();
        }

        String baseName = runDateTime.format(
                DateTimeFormatter.ofPattern("yyyy_MM_dd-HH_mm_ss")
        ) + "%s%s.run";

        File file = new File(runDirectory, String.format(baseName, "", description));

        if (!file.createNewFile()) {
            for (int i = 1; i <= Integer.MAX_VALUE; i++) {

                file = new File(runDirectory, String.format(baseName, "-" + i, description));

                if (file.createNewFile())
                    break;

            }
        }

        return file;

    }

    public ActiveRun startRun(boolean shared, String environment, String description, LocalDateTime runDateTimeOverride) throws IOException {

        String id;
        File file = null;

        if (shared) {
            file = createSharedRunFile(description, runDateTimeOverride);
            id = FilenameUtils.removeExtension(file.getName());
        } else
            id = UUID.randomUUID().toString();

        ActiveRun run = new ActiveRun(id, shared, environment, description);

        synchronized (activeRuns) {

            activeRuns.put(id, run);

            if (file != null)
                runOutputFiles.put(id, file);

        }

        return run;
        
    }

    public ActiveRun startRun(String environment) throws IOException {
        return startRun(false, environment, null, null);
    }

    public void finishRun(ActiveRun run) {

        File file = runOutputFiles.get(run.getId());

        if (file != null)
            run.save(file);

        synchronized (activeRuns) {
            activeRuns.remove(run.getId());
            runOutputFiles.remove(run.getId());
        }

    }

    public AbstractRun loadRun(String id) {

        File file = new File(runDirectory, id + ".run");

        if (!file.exists()) {

            file = new File(runDirectory, "archive/" + id + ".run");

            if (!file.exists())
                return null;

        }

        try {
            return new StoredRun(id, file);
        } catch (Throwable ex) {
            LOGGER.log(SEVERE, String.format("Failed to load %s!", id), ex);
            return null;
        }

    }

    public AbstractRun getRun(String id) {
        
        AbstractRun run = getActiveRun(id);

        if (run == null)
            run = loadRun(id);

        return run;
                
    }

    public ActiveRun getActiveRun(String id) {

        synchronized (activeRuns) {
            return activeRuns.get(id);
        }

    }

}
