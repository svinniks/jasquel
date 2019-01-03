/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run;

import static jasquel.common.Log.log;
import java.io.File;
import java.io.IOException;
import java.nio.file.FileVisitResult;
import static java.nio.file.FileVisitResult.CONTINUE;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import static java.nio.file.StandardWatchEventKinds.*;
import java.nio.file.WatchEvent;
import java.nio.file.WatchKey;
import java.nio.file.WatchService;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.function.Function;

import static java.util.logging.Level.FINER;

/**
 *
 * @author s.vinniks
 */
public class FileWatcher extends Runner {

    private class DebounceThread extends Thread {
        
        private final long interval;
        private final Map<String, Long> fileNameArrivals;
        private final BlockingQueue<File> scriptQueue;
        
        public DebounceThread(long interval) {
            this.interval = interval;
            fileNameArrivals = new ConcurrentHashMap<>();
            scriptQueue = new LinkedBlockingQueue<>();
        }
        
        @Override
        public void run() {
            
            log(FINER, "%s debounce thread started.\n", run.getId());
            
            while (!isInterrupted()) {
                
                File file;
                
                try {
                    file = scriptQueue.take();
                } catch(InterruptedException ex) {
                    break;
                }
                
                long arrival = fileNameArrivals.get(file.getAbsolutePath());
                
                if (arrival + interval > System.currentTimeMillis())
                    try {
                        Thread.sleep((arrival + interval) - System.currentTimeMillis());
                    } catch (InterruptedException ex) {
                        break;
                    }
                
                fileNameArrivals.remove(file.getAbsolutePath());
                
                FileWatcher.this.enqueueScript(file);
                
            }
            
            log(FINER, "%s debounce thread finished.\n", run.getId());
            
        }
        
        public void enqueueScript(File file) {
            
            if (!fileNameArrivals.containsKey(file.getAbsolutePath())) {
                fileNameArrivals.put(file.getAbsolutePath(), System.currentTimeMillis());
                scriptQueue.add(file);
            }
            
        }
        
    }
    
    private WatchService watchService;
    
    private final Map<WatchKey, Path> directoryWatchKeys;
    private final DebounceThread debounceThread;
    
    private Thread enqueueThread;
    
    public FileWatcher(
        ScriptEnginePool enginePool,
        ActiveRun run,
        File testDirectory,
        String environmentName,
        Function<String, String> environmentSupplier,
        int engineThreadCount
    ) {
        
        super(enginePool, run, testDirectory, environmentName, environmentSupplier, engineThreadCount);

        directoryWatchKeys = new HashMap<>();
        debounceThread = new DebounceThread(300);
        
    }
    
    private void registerDirectory(Path dir) throws IOException {
        
        Files.walkFileTree(dir, new SimpleFileVisitor<Path>() {
            
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                
                directoryWatchKeys.put(
                        dir.register(watchService, ENTRY_CREATE, ENTRY_DELETE, ENTRY_MODIFY),
                        dir);
                
                return CONTINUE;
                
            }
            
        });
        
    }
    
    @Override
    protected void enqueueScripts() throws Throwable {
        
        enqueueThread = Thread.currentThread();

        Path testDirectoryPath = testDirectory.toPath();
        watchService = testDirectoryPath.getFileSystem().newWatchService();
        registerDirectory(testDirectoryPath);
        
        debounceThread.start();
        
        while (!Thread.currentThread().isInterrupted()) {
            
            WatchKey watchKey;
            
            try {
                watchKey = watchService.take();
            } catch (InterruptedException ex) {
                break;
            }
            
            Path dir = directoryWatchKeys.get(watchKey);
            
            for (WatchEvent watchEvent : watchKey.pollEvents()) {
                
                if (watchEvent.kind() == OVERFLOW)
                    continue;
                
                Path eventPath = dir.resolve((Path)watchEvent.context());
                
                if (Files.isDirectory(eventPath)) { 
                    
                    if (watchEvent.kind() == ENTRY_CREATE)
                        registerDirectory(eventPath);
                    
                } else if (watchEvent.kind() == ENTRY_CREATE || watchEvent.kind() == ENTRY_MODIFY) {
                 
                    File file = eventPath.toFile();
                    
                    if (file.getName().matches(".*\\.js"))
                        debounceThread.enqueueScript(file);
                    
                }
                
            }
            
            if (!watchKey.reset())
                directoryWatchKeys.remove(watchKey);
            
        }
        
        watchService.close();
        
        debounceThread.interrupt();
        
    }

    @Override
    public void error(String error) {
        debounceThread.interrupt();
        super.error(error);
        enqueueThread.interrupt();
    }

    @Override
    public void success() {
        debounceThread.interrupt();
        super.success();
        enqueueThread.interrupt();
    }

    
    
}
