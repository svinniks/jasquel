/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.common;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.stream.Collectors;

/**
 *
 * @author s.vinniks
 */
public class StringUtil {
    
    public static String rpad(String string, int length) {
        return String.format("%1$-" + length + "s", string);  
    }
    public static String lpad(String string, int length) {
        return String.format("%1$" + length + "s", string);  
    }

    public static String nvl(String value, String valueIfNull) {
        return value == null ? valueIfNull : value;
    }

}
