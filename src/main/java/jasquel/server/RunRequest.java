/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.server;

import java.util.List;

/**
 *
 * @author s.vinniks
 */
public class RunRequest {
    
    public String environment;
    public String description;
    public int threads;
    public List<String> paths;
    boolean shared;
    
}
