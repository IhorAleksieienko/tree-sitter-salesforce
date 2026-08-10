{
  "targets": [
    {
      "target_name": "tree_sitter_salesforce_binding",
      "dependencies": [
        "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except"
      ],
      "include_dirs": [
        "apex/src",
        "apex-anon/src",
        "soql/src",
        "sosl/src",
        "formula/src",
        "sflog/src"
      ],
      "sources": [
        "bindings/node/binding.cc",
        "apex/src/parser.c",
        "apex-anon/src/parser.c",
        "soql/src/parser.c",
        "sosl/src/parser.c",
        "formula/src/parser.c",
        "sflog/src/parser.c"
      ],
      "conditions": [
        ["OS!='win'", {
          "cflags_c": [
            "-std=c11",
            "-fvisibility=hidden"
          ]
        }, {
          "msvs_settings": {
            "VCCLCompilerTool": {
              "AdditionalOptions": ["/utf-8"]
            }
          }
        }]
      ]
    }
  ]
}
