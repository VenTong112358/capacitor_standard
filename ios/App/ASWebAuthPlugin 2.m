#import <Foundation/Foundation.h>
@import Capacitor;

@class ASWebAuth;

CAP_PLUGIN(ASWebAuth, "ASWebAuth",
    CAP_PLUGIN_METHOD(start, CAPPluginReturnPromise);
)
