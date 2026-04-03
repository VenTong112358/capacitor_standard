#import <Foundation/Foundation.h>
@import Capacitor;

@class ASWebAuthPlugin;

CAP_PLUGIN(ASWebAuthPlugin, "ASWebAuth",
    CAP_PLUGIN_METHOD(start, CAPPluginReturnPromise);
)
