#include <Python.h>

typedef struct TSLanguage TSLanguage;
extern const TSLanguage *tree_sitter_formula(void);

static PyObject *language(PyObject *self, PyObject *args) {
    return PyCapsule_New((void *)tree_sitter_formula(), "tree_sitter.Language", NULL);
}

static PyMethodDef methods[] = {
    {"language", language, METH_NOARGS, "Return the Formula tree-sitter language."},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef module = {
    PyModuleDef_HEAD_INIT,
    "_binding_formula",
    NULL,
    -1,
    methods,
};

PyMODINIT_FUNC PyInit__binding_formula(void) {
    return PyModule_Create(&module);
}
