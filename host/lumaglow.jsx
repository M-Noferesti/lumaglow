#target photoshop

/* ExtendScript (ES3). Photoshop keeps the source intact and rebuilds a glow group. */
var LumaGlowCEP = LumaGlowCEP || {};
LumaGlowCEP.request = null;
LumaGlowCEP.result = '';

LumaGlowCEP.selectedId = function () {
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID('Lyr '), charIDToTypeID('Ordn'), charIDToTypeID('Trgt'));
    return executeActionGet(ref).getInteger(stringIDToTypeID('layerID'));
};
LumaGlowCEP.selectId = function (id) {
    var ref = new ActionReference();
    ref.putIdentifier(charIDToTypeID('Lyr '), id);
    var desc = new ActionDescriptor();
    desc.putReference(charIDToTypeID('null'), ref);
    desc.putBoolean(charIDToTypeID('MkVs'), false);
    executeAction(charIDToTypeID('slct'), desc, DialogModes.NO);
    return app.activeDocument.activeLayer;
};
LumaGlowCEP.meta = function (name) {
    var match = /\[LG:(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),([0-9a-fA-F]{6})\]$/.exec(name);
    if (!match) return null;
    return { sourceId: +match[1], values: [match[2], match[3], match[4], match[5], match[6], match[7]].join(',') };
};
LumaGlowCEP.nameFor = function (source, sourceId, request) {
    var safeName = source.name.replace(/\[LG:[^\]]+\]$/, '').substring(0, 26);
    var packed = [sourceId, request.radius, request.intensity, request.threshold, request.spread, request.tint, request.color].join(',');
    return 'LumaGlow - ' + safeName + ' [LG:' + packed + ']';
};
LumaGlowCEP.inspect = function () {
    try {
        if (!app.documents.length) return 'none';
        var doc = app.activeDocument, selected = doc.activeLayer;
        var selectedId = LumaGlowCEP.selectedId();
        var meta = selected.typename === 'LayerSet' ? LumaGlowCEP.meta(selected.name) : null;
        if (meta) {
            var sourceName = selected.name.replace(/^LumaGlow - /, '').replace(/ \[LG:[^\]]+\]$/, '');
            return 'edit|' + encodeURIComponent(sourceName) + '|' + meta.values + '|' + selectedId;
        }
        return 'new|' + encodeURIComponent(selected.name) + '||' + selectedId;
    } catch (error) {
        try { if (selectedId) LumaGlowCEP.selectId(selectedId); } catch (ignored) {}
        return 'error|' + encodeURIComponent(error.message || String(error));
    }
};
LumaGlowCEP.apply = function (radius, intensity, threshold, spread, tint, color) {
    try {
        if (!app.documents.length) throw new Error('Open a Photoshop document first.');
        var values = [radius, intensity, threshold, spread, tint];
        for (var i = 0; i < values.length; i++) if (isNaN(values[i]) || !isFinite(values[i])) throw new Error('Invalid control value.');
        if (radius < 2 || radius > 180 || intensity < 0 || intensity > 300 || threshold < 0 || threshold > 95 || spread < 0 || spread > 100 || tint < 0 || tint > 100 || !/^[0-9a-fA-F]{6}$/.test(color)) throw new Error('A control value is outside its range.');
        var doc = app.activeDocument;
        if (doc.mode !== DocumentMode.RGB) throw new Error('LumaGlow CEP requires an RGB document.');
        var selected = doc.activeLayer;
        var oldGroup = selected.typename === 'LayerSet' && LumaGlowCEP.meta(selected.name) ? selected : null;
        var sourceId = oldGroup ? LumaGlowCEP.meta(oldGroup.name).sourceId : LumaGlowCEP.selectedId();
        var source = LumaGlowCEP.selectId(sourceId);
        if (source.typename !== 'ArtLayer') throw new Error('Select a pixel, text, shape, or smart object layer.');
        if (source.isBackgroundLayer) throw new Error('Convert the Background to a normal layer first.');
        LumaGlowCEP.request = { doc: doc, sourceId: sourceId, oldGroup: oldGroup, radius: Math.round(radius), intensity: Math.round(intensity), threshold: Math.round(threshold), spread: Math.round(spread), tint: Math.round(tint), color: color.toLowerCase() };
        LumaGlowCEP.result = '';
        doc.suspendHistory(oldGroup ? 'Update LumaGlow CEP' : 'Create LumaGlow CEP', 'LumaGlowCEP.commit()');
        return LumaGlowCEP.result || 'error|No result from Photoshop.';
    } catch (error) {
        return 'error|' + encodeURIComponent(error.message || String(error));
    }
};
LumaGlowCEP.makePass = function (source, group, title, radius, opacity, request, filterColor) {
    if (opacity <= 0) return;
    var doc = app.activeDocument;
    doc.activeLayer = source;
    var copy = source.duplicate();
    copy.move(group, ElementPlacement.INSIDE);
    doc.activeLayer = copy;
    copy.visible = true;
    if (copy.kind !== LayerKind.NORMAL) copy.rasterize(RasterizeType.ENTIRELAYER);
    copy.name = title;
    copy.adjustLevels(Math.round(request.threshold * 2.55), 255, 1, 0, 255);
    copy.applyGaussianBlur(Math.max(0.1, radius));
    if (request.tint > 0) copy.photoFilter(filterColor, request.tint, true);
    copy.blendMode = BlendMode.SCREEN;
    copy.opacity = Math.min(100, Math.max(0, opacity));
};
LumaGlowCEP.commit = function () {
    var request = LumaGlowCEP.request, group = null;
    try {
        var doc = request.doc;
        var source = LumaGlowCEP.selectId(request.sourceId);
        var red = parseInt(request.color.substr(0, 2), 16), green = parseInt(request.color.substr(2, 2), 16), blue = parseInt(request.color.substr(4, 2), 16);
        var filterColor = new SolidColor();
        filterColor.rgb.red = red; filterColor.rgb.green = green; filterColor.rgb.blue = blue;
        group = doc.layerSets.add();
        group.name = 'LumaGlow rendering';
        group.visible = true;
        try { group.move(source, ElementPlacement.PLACEBEFORE); } catch (ignored) { /* Top level fallback for nested source layers. */ }
        var spread = request.spread / 100;
        var strength = request.intensity / 120;
        LumaGlowCEP.makePass(source, group, 'Core', request.radius * 0.24, 70 * strength * (1 - 0.25 * spread), request, filterColor);
        LumaGlowCEP.makePass(source, group, 'Halo', request.radius * 0.7, 60 * strength, request, filterColor);
        LumaGlowCEP.makePass(source, group, 'Atmosphere', request.radius * 1.55, 55 * strength * (0.35 + spread), request, filterColor);
        group.name = LumaGlowCEP.nameFor(source, request.sourceId, request);
        if (request.oldGroup) request.oldGroup.remove();
        doc.activeLayer = group;
        LumaGlowCEP.result = 'ok|' + encodeURIComponent(group.name);
    } catch (error) {
        try { if (group) group.remove(); } catch (ignored2) {}
        LumaGlowCEP.result = 'error|' + encodeURIComponent(error.message || String(error));
    }
};
