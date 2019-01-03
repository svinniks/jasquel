/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run.manager;

import com.google.gson.JsonDeserializationContext;
import com.google.gson.JsonDeserializer;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;
import jasquel.run.unit.TestUnit;
import java.lang.reflect.Type;

/**
 *
 * @author s.vinniks
 */
public class TestUnitAdapter implements JsonSerializer<TestUnit>, JsonDeserializer<TestUnit> {

    @Override
    public JsonElement serialize(TestUnit source, Type type, JsonSerializationContext context) {
        return context.serialize(source);
    }

    @Override
    public TestUnit deserialize(JsonElement json, Type type, JsonDeserializationContext context) throws JsonParseException {
        
        JsonObject unit = json.getAsJsonObject();
        
        try {
            Class unitClass = Class.forName("jasquel.run.unit." + unit.get("type").getAsString());
            return context.deserialize(unit, unitClass);
        } catch (Throwable ex) {
            throw new JsonParseException(ex);
        }
        
    }
    
}
