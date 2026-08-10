#include <Python.h>

typedef struct TSLanguage TSLanguage;
extern const TSLanguage *tree_sitter_apex(void);

static PyObject *language(PyObject *self, PyObject *args) {
    return PyCapsule_New((void *)tree_sitter_apex(), "tree_sitter.Language", NULL);
}

static PyMethodDef methods[] = {
    {"language", language, METH_NOARGS, "Return the Apex tree-sitter language."},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef module = {
    PyModuleDef_HEAD_INIT,
    "_binding_apex",
    NULL,
    -1,
    methods,
};

PyMODINIT_FUNC PyInit__binding_apex(void) {
    return PyModule_Create(&module);
}
