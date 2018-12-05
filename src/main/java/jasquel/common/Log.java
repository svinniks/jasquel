/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.common;

import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author s.vinniks
 */
public class Log {
    
    public static final Logger LOGGER = Logger.getLogger("jasquel");
    
    static {
        LOGGER.setUseParentHandlers(false);
    }
    
    public static void log(Level level, String message, Object... params) {
        LOGGER.log(level, String.format(message, params));
    }
    
}
