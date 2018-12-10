/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.reporter;

import jasquel.run.unit.Script;
import jasquel.run.unit.Suite;
import jasquel.run.unit.Test;
import jasquel.run.unit.TestUnit;
import jasquel.run.event.Log;
import jasquel.run.FileWatcher;
import jasquel.run.event.Error;
import jasquel.run.event.Event;
import static jasquel.run.event.Log.*;
import jasquel.run.event.RunStart;
import jasquel.run.event.UnitStart;
import jasquel.run.event.Success;
import jasquel.run.event.UnitEnd;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintStream;
import java.util.Scanner;
import java.util.Stack;

/**
 *
 * @author s.vinniks
 */
public class ConsoleReporter extends Reporter {

    private static final int[] LOG_LEVELS = new int[]{NONE, ERROR, INFO, ALL};
    private static final String[] LOG_LEVEL_NAMES = new String[]{"NONE", "ERROR", "INFO", "DEBUG"};
    
    private static final int CONSOLE_WIDTH = 85;
    
    public static String rpad(String string, int length) {
        
        if (string.length() > length)
            return string.substring(0, length - 3) + "...";
        else
            return String.format("%1$-" + length + "s", string);  
        
    }
    
    public static String formatDurationMinutes(long duration) {
        
        long seconds = duration / 1000;
        long milliseconds = duration % 1000;
        long minutes = seconds / 60;
        seconds = seconds % 60;
        
        return String.format("%d:%02d.%03d", minutes, seconds, milliseconds);
        
    }
    
    public static String formatDurationHours(long duration) {
        
        long seconds = duration / 1000;
        long milliseconds = duration % 1000;
        long minutes = seconds / 60;
        seconds = seconds % 60;
        long hours = minutes / 60;
        minutes = minutes % 60;
        
        return String.format("%d:%02d:%02d.%03d", hours, minutes, seconds, milliseconds);
        
    }
    
    private class ConsoleInputThread extends Thread {
    
        @Override
        public void run() {

            Scanner keyboard = new Scanner(in);

            while (!isInterrupted()) {

                String option = keyboard.next();

                if (colorsSupported)
                    out.printf("\u001B[1m");

                switch (option) {
                    case "l":
                        logLevelI = ++logLevelI % LOG_LEVELS.length;
                        out.printf("Log level set to %S.\n", LOG_LEVEL_NAMES[logLevelI]);
                        break;
                    case "f":
                        watcher.setForce(!watcher.isForce());
                        out.printf("Force mode %s!\n", watcher.isForce() ? "enabled" : "disabled");
                        break;
                    case "q":
                        watcher.success();
                        interrupt();
                        break;
                    default:
                        out.println("Invalid option!");
                        break;
                }

                if (colorsSupported)
                    System.out.printf("\u001B[0m");

            }

        }
        
    }
    
    private class TestGroup {
        
        public final StringBuilder logBuilder;
        public final String name;
        private int testCount;
        private Test test;
        
        public TestGroup(String name) {
            this.name = name;
            logBuilder = new StringBuilder();
            testCount = 0;
        }
        
        public void startTest(Test test) {
            this.test = test;
            testCount++;
        }
        
        public void endTest() {
            test = null;
        }
        
        public void message(Log message) {
            
            if (getLogLevel() > message.level)
                return;
            
            if (test != null) {
                        
                if (colorsSupported)
                    logBuilder.append("\u001B[1m#");
                            
                logBuilder
                        .append(testCount)
                        .append(" (line ")
                        .append(test.lineNumber)
                        .append("): ")
                        .append(test.name)
                        .append("\n");
                        
                if (colorsSupported)
                    logBuilder.append("\u001B[0m");
                
                test = null;
                
            }
            
            logBuilder
                    .append(message.message == null ? "" : message.message)
                    .append("\n");
            
        }
        
    }
    
    private final InputStream in;
    private final PrintStream out;
    private final boolean colorsSupported;
    
    private volatile int logLevelI;
    
    private FileWatcher watcher;
    private ConsoleInputThread watcherInputThread;
    
    private int scriptCount;
    private int suiteCount;
    private int testCount;
    private int passTestCount;
    private int failTestCount;
    
    private boolean emptyLine;
    
    private final Stack<TestUnit> unitStack;
    private final Stack<TestGroup> testGroupStack;
    
    public ConsoleReporter(InputStream in, PrintStream out, int logLevel) {
        
        this.in = in;
        this.out = out;
        
        logLevelI = 0;
        for (int i = 0; i < LOG_LEVELS.length; i++)
            if (LOG_LEVELS[i] == logLevel) {
                logLevelI = i;
                break;
            }
        
        colorsSupported = true; //"xterm".equals(System.getenv("TERM"));
        
        scriptCount = 0;
        suiteCount = 0;
        testCount = 0;
        passTestCount = 0;
        failTestCount = 0;
        
        unitStack = new Stack<>();
        testGroupStack = new Stack<>();
        
        emptyLine = false;
        
    }

    @Override
    public void emitEvents() {
    
        boolean finished = false;
        
        while (!Thread.currentThread().isInterrupted() && !finished) {
        
            Event event;
            
            try {
                event = takeEvent();
            } catch (InterruptedException ex) {
                break;
            }
            
            finished = event instanceof UnitEnd && unitStack.empty();
            
            if (event instanceof RunStart)
                runStart((RunStart)event);
            else if (event instanceof UnitStart)
                unitStart((UnitStart)event);
            else if (event instanceof Success)
                success((Success)event);
            else if (event instanceof Error)
                error((Error)event);
            else if (event instanceof Log)
                log((Log)event);
            
        }
        
    }
    
    public int getLogLevel() {
        return LOG_LEVELS[logLevelI];
    }
    
    public ConsoleReporter(int logLevel) {
        this(System.in, System.out, logLevel);
    }
    
    public void setWatcher(FileWatcher watcher) {
        
        this.watcher = watcher;
        
        watcherInputThread = new ConsoleInputThread();
        watcherInputThread.start();
        
    }
    
    private void displayHint() {
        
        if (watcher != null) {
            
            out.println();
            
            if (colorsSupported)
                out.printf("\u001B[1mType l or f and <Enter> to switch modes or q to quit.\u001B[0m\n");
            else
                out.printf("Type l or f and <Enter> to switch modes or q to quit.\n");
                
        }
        
    }
    
    private String getIndentation() {
        
        StringBuilder indentationBuilder = new StringBuilder();
        
        for (int i = 1; i <= unitStack.size(); i++)
            indentationBuilder.append("    ");
        
        return indentationBuilder.toString();
        
    }
    
    private void runStart(RunStart message) {
        
        out.printf("Environment: %s", message.environment);
                
        displayHint();
        
    }

    private void unitStart(UnitStart message) {
        
        TestUnit unit = message.unit;
        
        if (unit instanceof Script) {
            
            testGroupStack.push(new TestGroup("Script"));
            
            out.println();
            out.printf("Test script: %s\n", unit.name);
        
            scriptCount++;
            
        } else if (unit instanceof Suite) {
            
            testGroupStack.push(new TestGroup("Suite"));
            
            out.println();
            out.printf("%s%s\n", getIndentation(), unit.name);

            suiteCount++;
            emptyLine = false;
            
        } else if (unit instanceof Test) {
            
            TestUnit context = unitStack.peek();
            
            if (context instanceof Suite)
                testGroupStack.peek().startTest((Test)unit);
            
            testCount++;
            
        } 
        
        unitStack.push(unit);
        
    }
    
    private void success(Success message) {
        
        if (unitStack.isEmpty())
            
            outputRunDetails(message.duration);
        
        else {
            
            TestUnit unit = unitStack.pop();

            if (unit instanceof Test) {

                if (emptyLine)
                    out.println();
                
                out.printf(
                        "%s %.3f s\n",
                        rpad(
                                String.format(
                                        "%s%-4s %sPASS%s %s", 
                                        getIndentation(), 
                                        String.format("#%d:", testGroupStack.peek().testCount),
                                        colorsSupported ? "\u001B[32m" : "",
                                        colorsSupported ? "\u001B[0m" : "",
                                        unit.name),
                                CONSOLE_WIDTH), 
                        message.duration / 1000f);

                passTestCount++;
                emptyLine = false;
                
                testGroupStack.peek().endTest();

            } else if (unit instanceof Suite) {

                outputTestGroupDetails(testGroupStack.pop());
                
                emptyLine = true;

            } else if (unit instanceof Script) {
                
                outputTestGroupDetails(testGroupStack.pop());
                
                out.println();
                out.printf("Script finished in %s.\n", formatDurationMinutes(message.duration));
                out.println("-------------------------------------------------------------------------------------");

                displayHint();
                
            }
            
        }
        
    }

    private void error(Error message) {
        
        if (unitStack.isEmpty()) {
            
            out.println();
            out.printf("ActiveRun finished in %s with error:\n", formatDurationHours(message.duration));
            out.println(message.message);
            
        } else {
        
            TestUnit unit = unitStack.pop();

            if (unit instanceof Test) {

                if (emptyLine)
                    out.println();
                
                out.printf(
                        "%s %.3f s\n",
                        rpad(
                                String.format(
                                        "%s%-4s %sFAIL%s %s", 
                                        getIndentation(),
                                        String.format("#%d:", testGroupStack.peek().testCount), 
                                        colorsSupported ? "\u001B[31m" : "",
                                        colorsSupported ? "\u001B[0m" : "",
                                        unit.name),
                                CONSOLE_WIDTH), 
                        message.duration / 1000f);

                failTestCount++;
                testGroupStack.peek().message(message);
                
                emptyLine = false;

            } else if (unit instanceof Suite) {

                outputTestGroupDetails(testGroupStack.pop());
                
                out.println();
                out.printf("%sSuite has encountered an error:\n", getIndentation());
                out.printf("%s%s\n", getIndentation(), message.message.replace("\n", "\n" + getIndentation()));
                
                emptyLine = true;

            } else if (unit instanceof Script) {
                
                outputTestGroupDetails(testGroupStack.pop());
                
                out.println();
                out.printf("%sScript has encountered an error:\n", getIndentation());
                out.printf("%s%s\n", getIndentation(), message.message);
                
                out.println();
                out.printf("Script finished in %s.\n", formatDurationMinutes(message.duration));
                out.println("-------------------------------------------------------------------------------------");

                displayHint();
                
            }
            
        }
        
    }
    
    private void log(Log message) {
        testGroupStack.peek().message(message);
    }
    
    private void outputRunDetails(long duration) {
        
        out.println();
        
        if (colorsSupported)
            out.printf("\u001B[1m");
        
        out.println("Test run summary:");
        out.println();
        out.printf("    Scripts      %7d\n", scriptCount);
        out.printf("    Suites       %7d\n", suiteCount);
        out.println();
        out.printf("    Tests        %7d\n", testCount);
        
        if (colorsSupported)
            out.printf("        \u001B[32mPASSED\u001B[0;1m   %7d\n", passTestCount);
        else
            out.printf("        PASSED   %7d\n", passTestCount);
        
        if (failTestCount > 0)
            if (colorsSupported)
                out.printf("        \u001B[31mFAILED\u001B[0;1m   %7d\n", failTestCount);
            else
                out.printf("        FAILED   %7d\n", failTestCount);
        
        if (colorsSupported)
            out.printf("\u001B[0m");
        
        out.println();
        out.printf("ActiveRun finished in %s.\n", formatDurationHours(duration));
        
    }
    
    private void outputTestGroupDetails(TestGroup group) {
        
        if (group.logBuilder.length() > 0) {
            
            out.printf(
                    "\n%s%s run details:\n",
                    getIndentation(),
                    group.name);
            
            out.printf(
                    "%s%s",
                    getIndentation(),
                    group.logBuilder.toString().replace("\n", "\n" + getIndentation()));
            
        }
        
    }
   
}
