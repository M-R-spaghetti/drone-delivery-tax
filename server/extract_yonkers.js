const gdal = require('gdal-async');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('Opening GDB...');
    const gdbPath = path.resolve(__dirname, '../gdb_temp/NYS_Civil_Boundaries.gdb');
    const ds = await gdal.openAsync(gdbPath);

    console.log('Getting layer Cities...');
    const layer = ds.layers.get('Cities');
    if (!layer) {
        console.error('Cities layer not found. Available layers:');
        ds.layers.forEach(l => console.log(l.name));
        return;
    }

    console.log('Cities layer found. Feature count:', layer.features.count());

    let yonkersFeature = null;

    console.log('Searching for Yonkers...');
    let feature = layer.features.first();
    while (feature) {
        const name = feature.fields.get('NAME');
        if (name === 'Yonkers') {
            yonkersFeature = feature;
            break;
        }
        feature = layer.features.next();
    }

    if (!yonkersFeature) {
        console.error('Yonkers not found in Cities layer!');
        return;
    }

    const geom = yonkersFeature.getGeometry();

    // Need to transform correctly to EPSG:4326
    const out_srs = gdal.SpatialReference.fromEPSG(4326);
    const geom_srs = geom.srs || layer.srs;

    if (geom_srs && !geom_srs.isSame(out_srs)) {
        console.log('Transforming geometry to EPSG:4326...');
        geom.transformTo(out_srs);
    }

    const geojson = geom.toJSON();

    console.log('Successfully extracted Yonkers polygon!');

    const outPath = path.resolve(__dirname, '../yonkers.geojson');
    fs.writeFileSync(outPath, geojson);
    console.log('Saved to', outPath);
}

main().catch(console.error);
