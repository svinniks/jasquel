/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run.action;

/**
 *
 * @author s.vinniks
 */
public class RunErrorAction implements RunAction {
    
    public final String error;
        
    public RunErrorAction(String error) {
        this.error = error;
    }
    
}
