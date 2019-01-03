/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.function.Function;
import java.util.regex.Pattern;

/**
 *
 * @author s.vinniks
 */
public class FileRunner extends Runner {

    private static Pattern JS_FILE_PATTERN = Pattern.compile(".*\\.js");

    public static Collection<File> findScripts(File testDirectory, Collection<String> patternStrings) {

        Collection<Pattern> patterns = new ArrayList<>();
        String parentDirectoryPath = testDirectory.getParentFile().getPath();

        if (patternStrings != null)
            for (String pattern : patternStrings) {
                patterns.add(Pattern.compile(Pattern.quote((parentDirectoryPath + '/' + pattern).replace("\\", "/")) + ".*"));
            }

        Collection<File> scripts = new ArrayList<>();
        traverseDirectory(testDirectory, scripts, patterns);

        return scripts;

    }

    private static boolean fileMatches(File file, Collection<Pattern> patterns) {

        if (patterns.isEmpty())
            return true;

        for (Pattern pattern : patterns)
            if (pattern.matcher(file.getPath().replace("\\", "/")).matches())
                return true;

        return false;

    }

    private static void traverseDirectory(File directory, Collection<File> scripts, Collection<Pattern> patterns) {

        File[] files = directory.listFiles((File pathname) -> {

            if (pathname.isDirectory())
                return true;
            else
                return JS_FILE_PATTERN.matcher(pathname.getName()).matches() && fileMatches(pathname, patterns);

        });

        Arrays.sort(files);

        for (File file : files)
            if (file.isDirectory())
                traverseDirectory(file, scripts, patterns);
            else
                scripts.add(file);

    }

    private final Collection<File> scripts;
    
    public FileRunner(
        ScriptEnginePool enginePool,
        ActiveRun run,
        File testDirectory,
        String environmentName,
        Function<String, String> environmentSupplier,
        int engineThreadCount,
        Collection<File> scripts
    ) {
        super(enginePool, run, testDirectory, environmentName, environmentSupplier, engineThreadCount);
        this.scripts = scripts;
    }

    @Override
    protected void enqueueScripts() throws Throwable {
        
        for (File script : scripts)
            enqueueScript(script);
                
        success();
                
    }

    public Collection<File> getScripts() {
        return scripts;
    }
    
}
