/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package jasquel.common;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonNull;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import jasquel.exceptions.ArgumentException;
import java.io.Reader;
import java.io.StringReader;
import java.io.StringWriter;
import java.io.Writer;
import java.util.AbstractMap.SimpleImmutableEntry;
import java.util.Map.Entry;
import java.util.Set;
import java.util.Stack;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;
import org.xml.sax.Attributes;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.helpers.DefaultHandler;

/**
 *
 * @author s.vinniks
 */
public class XmlConverter {

    static final SAXParserFactory PARSER_FACTORY;
    static final String ELEMENT_PATTERN = "^([a-zA-Z_][a-zA-Z0-9_.-]*:)?[a-zA-Z_][a-zA-Z0-9_.-]*$";
    static final String ATTRIBUTE_PATTERN = "^@([a-zA-Z_][a-zA-Z0-9_.-]*:)?[a-zA-Z_][a-zA-Z0-9_.-]*$";
    
    static {
        PARSER_FACTORY = SAXParserFactory.newInstance();
        PARSER_FACTORY.setValidating(true);
    }
    
    static class XMLContentHandler extends DefaultHandler {

        private final Set<String> arrayPaths;
        private final Stack<Entry<String, JsonElement>> entryStack;
        
        XMLContentHandler(String... arrayPaths) {
            
            this.arrayPaths = Stream.of(arrayPaths).collect(Collectors.toSet());
            
            entryStack = new Stack<>();
            entryStack.push(new SimpleImmutableEntry<>("$", new JsonObject()));
            
        }
        
        private String getPath(String... suffix) {
            
            return Stream.concat(
                    entryStack.stream().map(entry -> entry.getKey()),
                    Stream.of(suffix)
            ).collect(Collectors.joining("."));
            
        }
        
        private void replaceParent(Entry<String, JsonElement> parentEntry, JsonElement parentElement) {
            
            // Grandparent is always an object.
            // The question is what is the parent property within the grandparent -
            // a simple property or an array?
            JsonObject grandparentObject = (JsonObject) entryStack.peek().getValue();

            // The property case
            if (grandparentObject.get(parentEntry.getKey()) == parentEntry.getValue()) {

                grandparentObject.remove(parentEntry.getKey());
                grandparentObject.add(parentEntry.getKey(), parentElement);

            } else {

                JsonArray propertyArray = grandparentObject.getAsJsonArray(parentEntry.getKey());

                propertyArray.remove(parentEntry.getValue());
                propertyArray.add(parentElement);

            }
            
        }
        
        private void pushElement(String name, String text) {
            
            JsonElement element = 
                    text == null
                    ? new JsonNull()
                    : new JsonPrimitive(text);
            
            Entry<String, JsonElement> parentEntry = entryStack.peek();
            
            // In case the parent is a NULL, this is a first sub-element.
            // Convert the parent to the OBJECT and reinsert it into the grandparent.
            // Then inisialize current element as a NULL.
            if (parentEntry.getValue() instanceof JsonNull) {
                
                entryStack.pop();

                JsonElement parentElement;
                        
                if (element instanceof JsonPrimitive)
                
                    parentElement = element;
                    
                else {
                    
                    JsonObject parentObject = new JsonObject();
                    
                    if (arrayPaths.contains(getPath(parentEntry.getKey(), name))) {
                        
                        JsonArray propertyArray = new JsonArray();
                        
                        propertyArray.add(element);
                        parentObject.add(name, propertyArray);
                        
                    } else
                        
                        parentObject.add(name, element);
                        
                    parentElement = parentObject;
                    
                }   
                
                replaceParent(parentEntry, parentElement);
                entryStack.push(new SimpleImmutableEntry<>(parentEntry.getKey(), parentElement));
               
            } else if (parentEntry.getValue() instanceof JsonPrimitive) {    
                
                entryStack.pop();
                
                JsonObject parentObject = new JsonObject();
                parentObject.add("#text", parentEntry.getValue());
                parentObject.add(name, element);
                
                replaceParent(parentEntry, parentObject);
                entryStack.push(new SimpleImmutableEntry<>(parentEntry.getKey(), parentObject));
                
            // If the parent is an object, then check if it already has the property with the same name.
            // If yes, then convert it to the array;
            } else {
                
                JsonObject parentObject = (JsonObject) parentEntry.getValue();
                JsonElement property = parentObject.get(name);
                
                if (property == null) {
                    
                    if (arrayPaths.contains(getPath(name))) {
                        
                        JsonArray propertyArray = new JsonArray();
                        
                        propertyArray.add(element);
                        parentObject.add(name, propertyArray);
                        
                    } else
                        
                        parentObject.add(name, element);
                    
                } else if (property instanceof JsonArray) {
                    
                    JsonArray propertyArray = (JsonArray) property;
                    propertyArray.add(element);
                    
                } else {
                    
                    parentObject.remove(name);
                    
                    JsonArray propertyArray = new JsonArray();
                    propertyArray.add(property);
                    propertyArray.add(element);
                    
                    parentObject.add(name, propertyArray);
                    
                }
                
            }
            
            if (element instanceof JsonNull)
                entryStack.push(new SimpleImmutableEntry<>(name, element));
            
        }
        
        private void pushElement(String name) {
            pushElement(name, null);
        }
        
        @Override
        public void startElement(String uri, String localName, String qName, Attributes atts) throws SAXException {
        
            pushElement(qName);
            
            for (int i = 0; i < atts.getLength(); i++) {
                
                pushElement("@" + atts.getQName(i));
                pushElement("#text", atts.getValue(i));
                
                entryStack.pop();
                
            }
            
        }

        @Override
        public void endElement(String uri, String localName, String qName) {
            
            entryStack.pop();
            
        }

        @Override
        public void characters(char[] ch, int start, int length) throws SAXException {
         
            String text = new String(ch, start, length);
            
            if (!text.matches("^\\s*$"))
                pushElement("#text", text);
            
        }

        public JsonElement getJsonObject() {
            return entryStack.peek().getValue();
        }
        
    }
    
    public static void toJSON(Reader xml, Writer json, String... arrayPaths) throws Throwable {
            
        SAXParser parser = PARSER_FACTORY.newSAXParser();
        XMLContentHandler contentHandler = new XMLContentHandler(arrayPaths);
        
        parser.parse(
                new InputSource(xml),
                contentHandler
        );
        
        JsonElement object = contentHandler.getJsonObject();
        
        Gson gson = new GsonBuilder()
                .serializeNulls()
                .setPrettyPrinting()
                .create();
        gson.toJson(object, json);
        
    }
    
    public static String toJSON(String xml, String... arrayPaths) throws Throwable {
        
        try (Reader xmlReader = new StringReader(xml); Writer jsonWriter = new StringWriter()) {
            
            toJSON(xmlReader, jsonWriter, arrayPaths);
            
            return jsonWriter.toString();
            
        }
        
    }
    
    private static void serializeElement(String name, JsonElement element, Writer xml) throws Throwable {
        
        if (name.equals("#text")) {
            
            if (element.isJsonPrimitive())
                
                xml.append(element.getAsString());
            
            else if (element.isJsonArray()) {
            
                JsonArray array = element.getAsJsonArray();
                
                for (int i = 0; i < array.size(); i++) {
                    
                    JsonElement item = array.get(i);
                    
                    if (!item.isJsonPrimitive())
                        throw new ArgumentException("Text item can only be a primitive!");
                    
                    xml.append(item.getAsString());
                    
                }
            
            } else 
                
                throw new ArgumentException("Element text can only be a primitive or an array!");
            
        } else {
            
            if (!name.matches(ELEMENT_PATTERN))
                throw new ArgumentException(String.format("Invalid element name %s!", name));
            
            if (element.isJsonPrimitive()) {
        
                xml
                        .append("<")
                        .append(name)
                        .append(">")
                        .append(element.getAsString())
                        .append("</")
                        .append(name)
                        .append(">");

            } else if (element.isJsonObject()) {

                xml
                        .append("<")
                        .append(name);

                JsonObject object = element.getAsJsonObject();

                for (Entry<String, JsonElement> property : object.entrySet())
                    if (property.getKey().matches(ATTRIBUTE_PATTERN)) {

                        xml
                                .append(" ")
                                .append(property.getKey().substring(1))
                                .append("=\"");

                        if (!property.getValue().isJsonPrimitive())
                            throw new ArgumentException(String.format("Attribute %s value is not a primitive!", property.getValue()));

                        xml
                                .append(property.getValue().getAsString().replace("\"", "&quot;"))
                                .append("\"");

                    } 

                xml.append(">");

                for (Entry<String, JsonElement> property : object.entrySet())
                    if (!property.getKey().matches(ATTRIBUTE_PATTERN))
                        serializeElement(property.getKey(), property.getValue(), xml);

                xml
                        .append("</")
                        .append(name)
                        .append(">");

            } else if (element.isJsonArray()) {

                JsonArray array = element.getAsJsonArray();

                for (int i = 0; i < array.size(); i++)
                    serializeElement(name, array.get(i), xml);

            }
            
        }
        
    }
    
    public static void fromJSON(Reader json, Writer xml) throws Throwable {
        
        JsonElement rootElement = Json.parse(json);
        
        if (!(rootElement instanceof JsonObject))
            throw new ArgumentException("Only objects can be serialized into XML!");
        
        JsonObject rootObject = (JsonObject) rootElement;
        
        if (rootObject.entrySet().size() != 1) 
            throw new ArgumentException("Object being serialized into XML must contain precisely one property!");
        
        for (Entry<String, JsonElement> entry : rootObject.entrySet())
            serializeElement(entry.getKey(), entry.getValue(), xml);
        
    }
    
    public static String fromJSON(String json) throws Throwable {
        
        try (Reader jsonReader = new StringReader(json); Writer xmlWriter = new StringWriter()) {
            
            fromJSON(jsonReader, xmlWriter);
            
            return xmlWriter.toString();
            
        }
        
    }
    
}
