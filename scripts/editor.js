window.editor = CodeMirror.fromTextArea(document.getElementById("editor"), 
{
    lineNumbers: true,
    mode: "text/x-csrc",
    theme: "default"
});