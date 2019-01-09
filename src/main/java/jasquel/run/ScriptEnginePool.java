package jasquel.run;

import jdk.nashorn.api.scripting.NashornScriptEngineFactory;
import jdk.nashorn.internal.objects.Global;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.SimpleScriptContext;
import java.util.HashSet;
import java.util.Set;

import static javax.script.ScriptContext.ENGINE_SCOPE;

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
        engine.setBindings(engine.createBindings(), ENGINE_SCOPE);
        engines.add(engine);
    }

}
