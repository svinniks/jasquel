/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.exceptions;

/**
 *
 * @author s.vinniks
 */
public class AuthenticationException extends Exception {

    public AuthenticationException() {
    }

    public AuthenticationException(String msg) {
        super(msg);
    }

    public AuthenticationException(String message, Throwable cause) {
        super(message, cause);
    }
    
}
