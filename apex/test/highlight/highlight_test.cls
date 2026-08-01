public class HighlightTest {
// ^ keyword
//     ^ keyword
//           ^ type
//                        ^ punctuation

    @IsTest
//  ^ attribute
//   ^ attribute
    private static void myMethod() {
//  ^ keyword
//          ^ keyword
//                 ^ type.builtin
//                      ^ function
//                              ^ punctuation
//                               ^ punctuation
//                                 ^ punctuation
        List<Account> accts = [SELECT Id FROM Account WHERE Name = 'Test'];
//      ^ type
//           ^ type
//                    ^ variable
//                          ^ operator
//                             ^ keyword
//                                    ^ property
//                                       ^ keyword
//                                            ^ type
//                                                    ^ keyword
//                                                          ^ property
//                                                               ^ operator
//                                                                 ^ string
    }
}
