/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run.unit;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

/**
 *
 * @author s.vinniks
 */
public class Call extends TestUnit {
    
    public final JsonElement params;
    
    public Call(String name, JsonElement params, int lineNumber) {
        super(name, lineNumber);
        this.params = params;
    }
    
}
