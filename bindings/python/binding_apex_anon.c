#include <Python.h>

typedef struct TSLanguage TSLanguage;
extern const TSLanguage *tree_sitter_apex_anon(void);

static PyObject *language(PyObject *self, PyObject *args) {
    return PyCapsule_New((void *)tree_sitter_apex_anon(), "tree_sitter.Language", NULL);
}

static PyMethodDef methods[] = {
    {"language", language, METH_NOARGS, "Return the Anonymous Apex tree-sitter language."},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef module = {
    PyModuleDef_HEAD_INIT,
    "_binding_apex_anon",
    NULL,
    -1,
    methods,
};

PyMODINIT_FUNC PyInit__binding_apex_anon(void) {
    return PyModule_Create(&module);
}
