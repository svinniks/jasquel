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
import jasquel.run.event.Event;
import java.lang.reflect.Type;

/**
 *
 * @author s.vinniks
 */
public class EventAdapter implements JsonSerializer<Event>, JsonDeserializer<Event> {

    @Override
    public JsonElement serialize(Event source, Type type, JsonSerializationContext context) {
        
        JsonObject event = new JsonObject();
        
        event.addProperty("event", source.getClass().getSimpleName());
        event.add("data", context.serialize(source));
        
        return event;
        
    }

    @Override
    public Event deserialize(JsonElement json, Type type, JsonDeserializationContext context) throws JsonParseException {
        
        JsonObject event = json.getAsJsonObject();
        
        try {
            Class eventClass = Class.forName("jasquel.run.event." + event.get("event").getAsString());
            return context.deserialize(event.get("data"), eventClass);
        } catch (Throwable ex) {
            throw new JsonParseException(ex);
        }
        
    }
    
}
