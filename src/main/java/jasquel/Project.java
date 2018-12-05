package jasquel;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import jasquel.common.Json;
import jasquel.common.TextFile;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Created by Sergejs Vinniks on 28-Nov-18.
 */
public class Project {

    public static Project load() throws IOException {
        return new Gson().fromJson(TextFile.read("project.json"), Project.class);
    }

    private String name;
    private LinkedHashMap<String, JsonElement> environments;

    public String getName() {
        return name;
    }

    public Set<String> getEnvironmentList() {
        return environments.keySet();
    }

    public String getEnvironment(String name) {
        return environments.get(name).toString();
    }

}
