/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.common;

import com.google.gson.JsonElement;
import com.google.gson.JsonSyntaxException;
import com.google.gson.internal.Streams;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;

/**
 *
 * @author s.vinniks
 */
public class Json {

    public static JsonElement parse(Reader reader) throws IOException {
        
        JsonReader jsonReader = new JsonReader(reader);
        jsonReader.setLenient(false);

        JsonElement result = Streams.parse(jsonReader);

        jsonReader.setLenient(true);
        if (jsonReader.peek() != JsonToken.END_DOCUMENT)
            throw new JsonSyntaxException("End of Json document expected!");
        
        return result;
        
    }

    public static JsonElement parse(String content) throws IOException {
        return parse(new StringReader(content));
    }
    
}
