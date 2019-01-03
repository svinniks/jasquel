/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run.event;

import com.google.gson.JsonElement;

/**
 *
 * @author s.vinniks
 */
public class Success extends Event implements UnitEnd {
    
    public final long duration;
    public final JsonElement result;
    
    public Success(long duration, JsonElement result) {
        
        super();
        
        this.duration = duration;
        this.result = result;
        
    }
    
    public Success(long duration) {
        this(duration, null);
    }

}
