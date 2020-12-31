function rgb(r,g,b) {
	return (
		((r & 0xff) << 16) |
		((g & 0xff) << 8) |
		(b & 0xff)
	);
};

module.exports = {

	colorRGB: {
			none:			rgb(16, 16, 16),
			// thanks to  Baldrian Sector for the extended list of color names
			red:			rgb(160, 0, 0),
			orange:			rgb(255, 100, 0),
			green:			rgb(0, 160, 0),
			blue:			rgb(0, 0, 160),
			purple:			rgb(80, 0, 80),
			yellow:			rgb(200, 200, 0),
			avocado:		rgb(86, 130, 4),
			bastardamber:	rgb(255, 200, 180),
			bisque:			rgb(255, 229, 196),
			celadon:		rgb(171, 225, 175),
			cerulean:		rgb(94, 127, 178),
			chartreuse:		rgb(127, 255, 0),
			coral:			rgb(255, 126, 79),
			ecru:			rgb(206, 178, 128),
			edgecombgray:	rgb(218, 212, 197),
			fuchsia:		rgb(223, 0, 223),
			fulvous:		rgb(228, 134, 0),
			glaucous:		rgb(136, 206, 234),
			grey:			rgb(140, 140, 140),
			indigo:			rgb(75, 0, 130),
			lilac:			rgb(204, 135, 153),
			maize:			rgb(247, 232, 92),
			mauve:			rgb(153, 51, 102),
			ochre:			rgb(205, 118, 34),
			olive:			rgb(128, 128, 0),
			puce:			rgb(223, 176, 255),
			rufous:			rgb(169, 27, 7),
			sage:			rgb(189, 184, 138),
			scarlet:		rgb(253, 37, 0),
			seafoamgreen:	rgb(195, 226, 190),
			skyblue:		rgb(135, 206, 235),
			taupe:			rgb(178, 138, 108),
			verdigris:		rgb(65, 129, 108),
			vermilion:		rgb(228, 66, 52),
			viridian:		rgb(195, 226, 190),
			wenge:			rgb(100, 84, 82),
			zaffre:			rgb(0, 20, 168)
		},

	colorName: [
		{ label: 'None',            id: 'none' },
		{ label: 'Red',	            id: 'red' },
		{ label: 'Orange',		    id: 'orange' },
		{ label: 'Green',		    id: 'green' },
		{ label: 'Blue',			id: 'blue' },
		{ label: 'Purple',		    id: 'purple' },
		{ label: 'Yellow',		    id: 'yellow' },
		{ label: 'Avocado',		    id: 'avocado' },
		{ label: 'Bastard Amber',   id: 'bastardamber' },
		{ label: 'Bisque',		    id: 'bisque' },
		{ label: 'Celadon',		    id: 'celadon' },
		{ label: 'Cerulean',		id: 'cerulean' },
		{ label: 'Chartreuse',	    id: 'chartreuse' },
		{ label: 'Coral',		    id: 'coral' },
		{ label: 'Ecru',			id: 'ecru' },
		{ label: 'Edgecomb Gray',	id: 'edgecombgray'},
		{ label: 'Fuchsia',		    id: 'fuchsia' },
		{ label: 'Fulvous',		    id: 'fulvous' },
		{ label: 'Glaucous',		id: 'glaucous' },
		{ label: 'Grey',			id: 'grey' },
		{ label: 'Indigo',		    id: 'indigo' },
		{ label: 'Lilac',		    id: 'lilac' },
		{ label: 'Maize',		    id: 'maize' },
		{ label: 'Mauve',		    id: 'mauve' },
		{ label: 'Ochre',		    id: 'ochre' },
		{ label: 'Olive',		    id: 'olive' },
		{ label: 'Puce',			id: 'puce' },
		{ label: 'Rufous',		    id: 'rufous' },
		{ label: 'Sage',			id: 'sage' },
		{ label: 'Scarlet',		    id: 'scarlet' },
		{ label: 'Seafoam Green',	id: 'seafoamgreen' },
		{ label: 'Skyblue',		    id: 'skyblue' },
		{ label: 'Taupe',		    id: 'taupe' },
		{ label: 'Verdigris',	    id: 'verdigris' },
		{ label: 'Vermilion',	    id: 'vermilion' },
		{ label: 'Viridian',		id: 'viridian' },
		{ label: 'Wenge',			id: 'wenge'},
		{ label: 'Zaffre',			id: 'zaffre'}
	]
};
