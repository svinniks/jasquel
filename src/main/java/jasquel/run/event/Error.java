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
public class Error extends Log implements UnitEnd {
    
    public final long duration;
    
    public Error(String message, long duration) {
        super(message, ERROR);
        this.duration = duration;
    }

}

