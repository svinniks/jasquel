/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run.event;

import jasquel.run.unit.TestUnit;

/**
 *
 * @author s.vinniks
 */
public class UnitStart extends Event {
    
    public final long startTime;
    public final TestUnit unit;
    
    public UnitStart(TestUnit unit) {
        this.unit = unit;
        this.startTime = System.currentTimeMillis();
    }

}
