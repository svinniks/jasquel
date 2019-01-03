package jasquel.run;

import jdk.nashorn.api.scripting.NashornScriptEngineFactory;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.SimpleScriptContext;
import java.util.HashSet;
import java.util.Set;

/**
 * Created by Sergejs Vinniks on 03-Dec-18.
 */
public class ScriptEnginePool {

    private final static NashornScriptEngineFactory ENGINE_FACTORY = new NashornScriptEngineFactory();

    private final Set<ScriptEngine> engines;

    public ScriptEnginePool() {
        engines = new HashSet<>();
    }

    synchronized public ScriptEngine getEngine() {

        ScriptEngine engine;

        if (engines.size() == 0)
            engine = ENGINE_FACTORY.getScriptEngine("--language=es6");
        else {
            engine = engines.iterator().next();
            engines.remove(engine);
        }

        return engine;

    }

    synchronized public void releaseEngine(ScriptEngine engine) {
        engine.setContext(new SimpleScriptContext());
        engines.add(engine);
    }

}
