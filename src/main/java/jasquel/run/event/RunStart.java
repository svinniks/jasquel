/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run.event;

/**
 *
 * @author s.vinniks
 */
public class RunStart extends Event {

    public final String environment;
    public final long startTime;
    
    public RunStart(String environment, long startTime) {
        this.environment = environment;
        this.startTime = startTime;
    }

}
