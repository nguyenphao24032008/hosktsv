<?php

header('Content-Type: application/json');

echo(json_encode([
	'189c0bbef2cb8c93eb0476dc264e798d56a42ca8f9d4ba557184d89b59558d31:5249' => [
		'version' => '1.4.3',
		'engine' => 'hoskt-native',
		'timestamp' => 1783299252,
		'target' => 'hoskt-v10',
	]
]));