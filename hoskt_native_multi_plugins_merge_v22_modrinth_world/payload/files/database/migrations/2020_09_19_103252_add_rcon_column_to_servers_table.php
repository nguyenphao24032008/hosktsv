<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddRconColumnToServersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->integer('rcon_port')->nullable()->after('allocation_id');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->dropColumn('rcon_port');
        });
    }
}
