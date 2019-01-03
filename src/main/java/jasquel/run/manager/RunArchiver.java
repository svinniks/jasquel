package jasquel.run.manager;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.attribute.BasicFileAttributeView;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.logging.Level;
import java.util.logging.Logger;

import static jasquel.common.Log.LOGGER;

/**
 * Created by Sergejs Vinniks on 29-Nov-18.
 */
public class RunArchiver {

    final private File runDirectory;

    public RunArchiver(File runDirectory) {
        this.runDirectory = runDirectory;
    }

    public void archive() {

        LocalDate now = LocalDate.now();

        File[] files = runDirectory.listFiles((File file) -> {

            if (file.isDirectory())
                return false;
            else {

                try {

                    BasicFileAttributes attributes = Files.readAttributes(file.toPath(), BasicFileAttributes.class);
                    LocalDateTime creationDateTime = LocalDateTime.ofInstant(attributes.creationTime().toInstant(), ZoneId.systemDefault());

                    return creationDateTime.isBefore(now.atStartOfDay());

                } catch (IOException ex) {
                    return false;
                }

            }

        });

        int filesArchived = 0;

        for (File file : files) {

            try {

                BasicFileAttributes attributes = Files.readAttributes(file.toPath(), BasicFileAttributes.class);
                LocalDate creationDate = LocalDateTime.ofInstant(attributes.creationTime().toInstant(), ZoneId.systemDefault()).toLocalDate();

                File newFile = new File(
                        runDirectory,
                        String.format(
                                "archive/%d/%d/%d/%s",
                                creationDate.getYear(),
                                creationDate.getMonthValue(),
                                creationDate.getDayOfMonth(),
                                file.getName()
                        )
                );

                File newDirectory = newFile.getParentFile();

                if (!newDirectory.exists())
                    newDirectory.mkdirs();

                Files.move(file.toPath(), newFile.toPath());
                filesArchived++;

            } catch (IOException ex) {
                LOGGER.log(Level.SEVERE, String.format("An error occured while archiving %s", file.getPath()), ex);
            }

        }

        LOGGER.log(Level.INFO, String.format("%d files have been successfully moved to the archive folder!", filesArchived));

    }

    public void start() {

        new Thread(() -> {

            LocalDate lastArchivedDate = null;

            while (!Thread.currentThread().isInterrupted()) {

                LocalDate now = LocalDate.now();

                if (lastArchivedDate == null || now.isAfter(lastArchivedDate))
                    archive();

                lastArchivedDate = now;

                try {
                    Thread.sleep(10000);
                } catch(InterruptedException ex) {
                    break;
                }

            }

        }).start();

    }

}
