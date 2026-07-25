<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddExpireDateColumnToServersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->integer('free_package_id')->after('updated_at');
            $table->dateTime('free_expire')->nullable()->after('free_package_id');
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
            $table->dropColumn('free_package_id');
            $table->dropColumn('free_expire');
        });
    }
}
