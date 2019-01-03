/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.run.action;

import jasquel.run.ScriptRun;

/**
 *
 * @author s.vinniks
 */
public class RunScriptAction implements RunAction {
    
    public final ScriptRun scriptRun;
        
    public RunScriptAction(ScriptRun scriptRun) {
        this.scriptRun = scriptRun;
    }
    
}
