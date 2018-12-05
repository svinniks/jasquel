package jasquel.common;

import java.io.*;
import java.util.stream.Collectors;

/**
 * Created by Sergejs Vinniks on 28-Nov-18.
 */
public class TextFile {

    public static String read(File file) throws FileNotFoundException {
        return new BufferedReader(new FileReader(file)).lines().collect(Collectors.joining("\n"));
    }

    public static String read(String name) throws FileNotFoundException {
        return read(new File(name));
    }

    public static void write(File file, String content) throws IOException {
        try (PrintWriter writer = new PrintWriter(file)) {
            writer.append(content);
        }
    }

    public static void write(String fileName, String content) throws IOException {
        write(new File(fileName), content);
    }

}
