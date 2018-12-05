/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.reporter;

import jasquel.run.event.Log;

/**
 *
 * @author s.vinniks
 */
public class DebugMessage extends Log {
    
    public static final int DEBUG = 50;
    
    public DebugMessage(String message, int level) {
        super(message, DEBUG);
    }
    
}
