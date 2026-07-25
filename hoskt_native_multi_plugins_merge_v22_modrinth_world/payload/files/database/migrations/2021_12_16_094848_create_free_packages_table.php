<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateFreePackagesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('free_packages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('image');
            $table->integer('memory');
            $table->integer('disk');
            $table->integer('cpu');
            $table->integer('swap');
            $table->integer('database_limit');
            $table->integer('allocation_limit');
            $table->integer('backup_limit');
            $table->text('node_ids');
            $table->text('egg_ids');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('free_packages');
    }
}
