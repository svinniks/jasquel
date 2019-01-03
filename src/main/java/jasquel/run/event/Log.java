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
public class Log extends Event {

    public final static int NONE = Integer.MAX_VALUE;
    public final static int ERROR = 200;
    public final static int INFO = 100;
    public final static int ALL = 0;
    
    public final String message;
    public final int level;
    
    public Log(String message, int level) {
        this.message = message;
        this.level = level;
    }
 
}
