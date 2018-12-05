/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package http;

import java.util.HashMap;
import java.util.Map;

/**
 *
 * @author s.vinniks
 */
public class Response {
    
    public Response(int code, String body) {
        
        this.code = code;
        this.body = body;
        
        headers = new HashMap<>();
        
    }
    
    public int code;
    public String body;
    public Map<String, String> headers;
    
}
