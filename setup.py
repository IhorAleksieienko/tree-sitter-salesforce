import platform
from setuptools import Extension, setup

extra_compile_args = ["/utf-8"] if platform.system() == "Windows" else ["-std=c11"]

extensions = [
    Extension(
        name="tree_sitter_salesforce._binding_apex",
        sources=[
            "bindings/python/binding_apex.c",
            "apex/src/parser.c",
        ],
        include_dirs=["apex/src"],
        extra_compile_args=extra_compile_args,
    ),
    Extension(
        name="tree_sitter_salesforce._binding_apex_anon",
        sources=[
            "bindings/python/binding_apex_anon.c",
            "apex-anon/src/parser.c",
        ],
        include_dirs=["apex-anon/src"],
        extra_compile_args=extra_compile_args,
    ),
    Extension(
        name="tree_sitter_salesforce._binding_soql",
        sources=[
            "bindings/python/binding_soql.c",
            "soql/src/parser.c",
        ],
        include_dirs=["soql/src"],
        extra_compile_args=extra_compile_args,
    ),
    Extension(
        name="tree_sitter_salesforce._binding_sosl",
        sources=[
            "bindings/python/binding_sosl.c",
            "sosl/src/parser.c",
        ],
        include_dirs=["sosl/src"],
        extra_compile_args=extra_compile_args,
    ),
    Extension(
        name="tree_sitter_salesforce._binding_formula",
        sources=[
            "bindings/python/binding_formula.c",
            "formula/src/parser.c",
        ],
        include_dirs=["formula/src"],
        extra_compile_args=extra_compile_args,
    ),
    Extension(
        name="tree_sitter_salesforce._binding_sflog",
        sources=[
            "bindings/python/binding_sflog.c",
            "sflog/src/parser.c",
        ],
        include_dirs=["sflog/src"],
        extra_compile_args=extra_compile_args,
    ),
]

setup(
    ext_modules=extensions,
)
