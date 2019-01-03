/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run.unit;

import com.google.gson.annotations.SerializedName;

/**
 *
 * @author s.vinniks
 */
public abstract class TestUnit {
    
    public final String type;
    public final String name;
    public final int lineNumber;
    public final Long startTime;

    public boolean skip;
    
    @SuppressWarnings("OverridableMethodCallInConstructor")
    public TestUnit(String name, int lineNumber) {
        
        this.type = this.getClass().getSimpleName();
        this.name = name;
        this.lineNumber = lineNumber;
        
        startTime = System.currentTimeMillis();
        skip = false;
        
    }
    
    public long getDuration() {
        return System.currentTimeMillis() - startTime;
    }
    
}
