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
public class ArgumentException extends Exception {

    /**
     * Constructs an instance of <code>ArgumentException</code> with the
     * specified detail message.
     *
     * @param msg the detail message.
     */
    public ArgumentException(String msg) {
        super(msg);
    }
}
